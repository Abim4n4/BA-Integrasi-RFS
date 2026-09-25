import { LinkBudgetRecord, SplitterRatio, WavelengthNm, SfpClass, OpticalStatus, OdpPortMeasurement } from "../types.ts";

export const SPLITTER_LOSS: Record<SplitterRatio, number> = {
  "None": 0.0,
  "1:2": 3.5,
  "1:4": 7.25,
  "1:8": 10.50,
  "1:16": 14.00,
  "1:32": 17.50
};

export const FIBER_LOSS_PER_KM: Record<WavelengthNm, number> = {
  1310: 0.35,
  1490: 0.35,
  1550: 0.22
};

export const SFP_DEFAULT_TX: Record<SfpClass, number> = {
  "Class B+": 3.0,
  "Class C+": 5.0,
  "Class C++": 7.5,
  "Custom": 5.0
};

export function getOpticalStatus(dbm: number): OpticalStatus {
  if (isNaN(dbm)) return "MARGINAL";
  if (dbm > -8.0) return "FAIL"; // Overpower risk for receiver
  if (dbm >= -22.0 && dbm <= -16.0) return "OPTIMAL";
  if (dbm >= -24.5 && dbm < -16.0) return "PASS";
  if (dbm >= -26.0 && dbm < -24.5) return "MARGINAL";
  return "FAIL"; // < -26 dBm (Drop link or excessive loss)
}

export function getStatusBadgeInfo(status: OpticalStatus) {
  switch (status) {
    case "OPTIMAL":
      return {
        label: "OPTIMAL (-16 s/d -22 dBm)",
        badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
        dotColor: "bg-emerald-400",
        bgLight: "bg-emerald-950/20 border-emerald-500/30"
      };
    case "PASS":
      return {
        label: "LAYAK / PASS (-22 s/d -24.5 dBm)",
        badgeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
        dotColor: "bg-blue-400",
        bgLight: "bg-blue-950/20 border-blue-500/30"
      };
    case "MARGINAL":
      return {
        label: "MARGINAL (-24.5 s/d -26 dBm)",
        badgeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
        dotColor: "bg-amber-400",
        bgLight: "bg-amber-950/20 border-amber-500/30"
      };
    case "FAIL":
    default:
      return {
        label: "DROP / FAIL (< -26 dBm)",
        badgeClass: "bg-rose-500/20 text-rose-400 border border-rose-500/40",
        dotColor: "bg-rose-400",
        bgLight: "bg-rose-950/20 border-rose-500/30"
      };
  }
}

export interface LinkCalculationResult {
  feederLossDb: number;
  totalSpliceLossDb: number;
  totalConnectorLossDb: number;
  splitter1LossDb: number;
  distributionLossDb: number;
  splitter2LossDb: number;
  safetyMarginDb: number;
  totalLossTheoryDb: number;
  expectedPowerOdcDbm: number;
  expectedPowerOdpDbm: number;
}

export function calculateLinkBudget(params: {
  txPowerDbm: number;
  feederLengthKm: number;
  fiberLossPerKm: number;
  spliceCount: number;
  spliceLossDbEach: number;
  connectorCount: number;
  connectorLossDbEach: number;
  splitter1Ratio: SplitterRatio;
  distributionLengthKm: number;
  splitter2Ratio: SplitterRatio;
  safetyMarginDb: number;
}): LinkCalculationResult {
  const feederLossDb = Number((params.feederLengthKm * params.fiberLossPerKm).toFixed(2));
  const totalSpliceLossDb = Number((params.spliceCount * params.spliceLossDbEach).toFixed(2));
  const totalConnectorLossDb = Number((params.connectorCount * params.connectorLossDbEach).toFixed(2));
  const splitter1LossDb = SPLITTER_LOSS[params.splitter1Ratio] || 0;
  const distributionLossDb = Number((params.distributionLengthKm * params.fiberLossPerKm).toFixed(2));
  const splitter2LossDb = SPLITTER_LOSS[params.splitter2Ratio] || 0;
  const safetyMarginDb = Number(params.safetyMarginDb.toFixed(2));

  // ODC theoretical loss: feeder + portion of splice/connector + splitter 1
  const spliceAtOdc = Math.ceil(params.spliceCount / 2) * params.spliceLossDbEach;
  const connAtOdc = 2 * params.connectorLossDbEach;
  const odcLoss = feederLossDb + spliceAtOdc + connAtOdc + splitter1LossDb;
  const expectedPowerOdcDbm = Number((params.txPowerDbm - odcLoss).toFixed(2));

  // Total link loss
  const totalLossTheoryDb = Number(
    (
      feederLossDb +
      totalSpliceLossDb +
      totalConnectorLossDb +
      splitter1LossDb +
      distributionLossDb +
      splitter2LossDb +
      safetyMarginDb
    ).toFixed(2)
  );

  const expectedPowerOdpDbm = Number((params.txPowerDbm - totalLossTheoryDb).toFixed(2));

  return {
    feederLossDb,
    totalSpliceLossDb,
    totalConnectorLossDb,
    splitter1LossDb,
    distributionLossDb,
    splitter2LossDb,
    safetyMarginDb,
    totalLossTheoryDb,
    expectedPowerOdcDbm,
    expectedPowerOdpDbm
  };
}

export const INITIAL_LINK_BUDGET_RECORDS: LinkBudgetRecord[] = [
  {
    id: "LB-202609-001",
    projectCode: "LB-FMKA-TNG-001",
    clusterName: "Paradise Serpong II (Cluster Lavender)",
    oltName: "OLT-HUAWEI-MA5800-X7",
    oltFrameSlotPort: "0/2/8 (GPON Port 8)",
    odcName: "ODC-TNG-SETU-02 (Kapasitas 144 Core)",
    odpName: "ODP-SETU-LAV-04 (Tiang P-18)",
    technicianName: "Rian Pratama",
    technicianPhone: "0812-3456-7890",
    waspangName: "Ir. Joko Sutrisno (WASPANG)",
    waspangPhone: "0811-9876-5432",
    measurementDate: "2026-09-24",
    measurementTime: "14:30",
    sfpClass: "Class C+",
    txPowerDbm: 5.0,
    wavelength: 1490,
    feederLengthKm: 3.4,
    fiberLossPerKm: 0.35,
    feederLossDb: 1.19,
    spliceCount: 4,
    spliceLossDbEach: 0.10,
    totalSpliceLossDb: 0.40,
    connectorCount: 4,
    connectorLossDbEach: 0.30,
    totalConnectorLossDb: 1.20,
    splitter1Ratio: "1:4",
    splitter1LossDb: 7.25,
    distributionLengthKm: 0.85,
    distributionLossDb: 0.30,
    splitter2Ratio: "1:8",
    splitter2LossDb: 10.50,
    safetyMarginDb: 2.0,
    totalLossTheoryDb: 22.84,
    expectedPowerOdcDbm: -9.84,
    expectedPowerOdpDbm: -17.84,
    measuredOdcPowerDbm: -10.15,
    odpCapacityPorts: 8,
    averageMeasuredOdpDbm: -18.25,
    overallStatus: "OPTIMAL",
    portsMeasurement: [
      { portNumber: 1, measuredPowerDbm: -18.10, status: "OPTIMAL", deltaFromTheory: 0.26, notes: "Konektor bersih" },
      { portNumber: 2, measuredPowerDbm: -18.25, status: "OPTIMAL", deltaFromTheory: 0.41, notes: "Normal" },
      { portNumber: 3, measuredPowerDbm: -18.15, status: "OPTIMAL", deltaFromTheory: 0.31, notes: "Normal" },
      { portNumber: 4, measuredPowerDbm: -18.30, status: "OPTIMAL", deltaFromTheory: 0.46, notes: "Normal" },
      { portNumber: 5, measuredPowerDbm: -18.40, status: "OPTIMAL", deltaFromTheory: 0.56, notes: "Normal" },
      { portNumber: 6, measuredPowerDbm: -18.20, status: "OPTIMAL", deltaFromTheory: 0.36, notes: "Normal" },
      { portNumber: 7, measuredPowerDbm: -18.35, status: "OPTIMAL", deltaFromTheory: 0.51, notes: "Normal" },
      { portNumber: 8, measuredPowerDbm: -18.25, status: "OPTIMAL", deltaFromTheory: 0.41, notes: "Normal" }
    ],
    notes: "Pengukuran redaman optik OLT ke ODP tuntas 100%. Redaman sangat prima rata-rata -18.25 dBm di bawah standar threshold max -24 dBm. ODP siap diaktifkan dan disambungkan ke ONT pelanggan.",
    createdAt: "2026-09-24T14:30:00Z"
  }
];

const STORAGE_KEY = "fmka_link_budget_records_v1";

export function loadLinkBudgetRecords(): LinkBudgetRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load link budget records from localStorage:", e);
  }
  return INITIAL_LINK_BUDGET_RECORDS;
}

export function saveLinkBudgetRecords(records: LinkBudgetRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save link budget records to localStorage:", e);
  }
}
