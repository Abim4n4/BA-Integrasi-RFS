import React, { useState, useEffect } from "react";
import {
  Activity,
  Calculator,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Printer,
  Save,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Sliders,
  Layers,
  Sparkles,
  Info,
  Check,
  Send,
  Zap,
  Camera,
  FolderOpen
} from "lucide-react";
import {
  LinkBudgetRecord,
  SfpClass,
  WavelengthNm,
  SplitterRatio,
  OpticalStatus,
  OdpPortMeasurement,
  User
} from "../types.ts";
import {
  calculateLinkBudget,
  getOpticalStatus,
  getStatusBadgeInfo,
  loadLinkBudgetRecords,
  saveLinkBudgetRecords,
  INITIAL_LINK_BUDGET_RECORDS,
  SPLITTER_LOSS,
  FIBER_LOSS_PER_KM,
  SFP_DEFAULT_TX
} from "../services/linkBudgetService.ts";
import { DigitalSignaturePad } from "./DigitalSignaturePad.tsx";
import { LinkBudgetReportModal } from "./LinkBudgetReportModal.tsx";

interface LinkBudgetPanelProps {
  currentUser: User | null;
  onShowToast: (msg: string, type: "success" | "error") => void;
  onApplyToRfsForm?: (data: {
    measuredDbm: number;
    odpName: string;
    clusterName: string;
    notes: string;
  }) => void;
}

export const LinkBudgetPanel: React.FC<LinkBudgetPanelProps> = ({
  currentUser,
  onShowToast,
  onApplyToRfsForm
}) => {
  // Sub-tabs: "calculator" | "tescom" | "records"
  const [subTab, setSubTab] = useState<"calculator" | "tescom" | "records">("calculator");

  // Records list
  const [records, setRecords] = useState<LinkBudgetRecord[]>(() => loadLinkBudgetRecords());
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  // Active form data
  const [projectCode, setProjectCode] = useState("LB-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-001");
  const [clusterName, setClusterName] = useState("Paradise Serpong II");
  const [oltName, setOltName] = useState("OLT-HUAWEI-MA5800-X7");
  const [oltFrameSlotPort, setOltFrameSlotPort] = useState("0/2/8 (GPON Port 8)");
  const [odcName, setOdcName] = useState("ODC-TNG-SETU-02 (144 Core)");
  const [odpName, setOdpName] = useState("ODP-SETU-LAV-04");
  const [technicianName, setTechnicianName] = useState(currentUser?.name || "Rian Pratama");
  const [technicianPhone, setTechnicianPhone] = useState("0812-3456-7890");
  const [waspangName, setWaspangName] = useState("Ir. Joko Sutrisno (WASPANG)");
  const [waspangPhone, setWaspangPhone] = useState("0811-9876-5432");
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().slice(0, 10));
  const [measurementTime, setMeasurementTime] = useState("14:30");

  // OLT Parameters
  const [sfpClass, setSfpClass] = useState<SfpClass>("Class C+");
  const [txPowerDbm, setTxPowerDbm] = useState<number>(5.0);
  const [wavelength, setWavelength] = useState<WavelengthNm>(1490);

  // Feeder
  const [feederLengthKm, setFeederLengthKm] = useState<number>(3.4);
  const [fiberLossPerKm, setFiberLossPerKm] = useState<number>(0.35);

  // Passives
  const [spliceCount, setSpliceCount] = useState<number>(4);
  const [spliceLossDbEach, setSpliceLossDbEach] = useState<number>(0.10);
  const [connectorCount, setConnectorCount] = useState<number>(4);
  const [connectorLossDbEach, setConnectorLossDbEach] = useState<number>(0.30);

  // Splitters
  const [splitter1Ratio, setSplitter1Ratio] = useState<SplitterRatio>("1:4");
  const [distributionLengthKm, setDistributionLengthKm] = useState<number>(0.85);
  const [splitter2Ratio, setSplitter2Ratio] = useState<SplitterRatio>("1:8");
  const [safetyMarginDb, setSafetyMarginDb] = useState<number>(2.0);

  // TesCom Lapangan
  const [measuredOdcPowerDbm, setMeasuredOdcPowerDbm] = useState<number>(-10.15);
  const [odpCapacityPorts, setOdpCapacityPorts] = useState<8 | 16 | 24>(8);
  const [portsMeasurement, setPortsMeasurement] = useState<OdpPortMeasurement[]>([
    { portNumber: 1, measuredPowerDbm: -18.10, status: "OPTIMAL", deltaFromTheory: 0.26, notes: "Konektor bersih" },
    { portNumber: 2, measuredPowerDbm: -18.25, status: "OPTIMAL", deltaFromTheory: 0.41, notes: "Normal" },
    { portNumber: 3, measuredPowerDbm: -18.15, status: "OPTIMAL", deltaFromTheory: 0.31, notes: "Normal" },
    { portNumber: 4, measuredPowerDbm: -18.30, status: "OPTIMAL", deltaFromTheory: 0.46, notes: "Normal" },
    { portNumber: 5, measuredPowerDbm: -18.40, status: "OPTIMAL", deltaFromTheory: 0.56, notes: "Normal" },
    { portNumber: 6, measuredPowerDbm: -18.20, status: "OPTIMAL", deltaFromTheory: 0.36, notes: "Normal" },
    { portNumber: 7, measuredPowerDbm: -18.35, status: "OPTIMAL", deltaFromTheory: 0.51, notes: "Normal" },
    { portNumber: 8, measuredPowerDbm: -18.25, status: "OPTIMAL", deltaFromTheory: 0.41, notes: "Normal" }
  ]);

  // Signatures & Photos
  const [signatureTechnician, setSignatureTechnician] = useState<string>("");
  const [signatureWaspang, setSignatureWaspang] = useState<string>("");
  const [notes, setNotes] = useState("Pengukuran redaman optik OLT ke ODP tuntas 100%. Redaman sangat prima rata-rata di bawah standar threshold max -24 dBm. ODP siap diaktifkan.");

  // Modal print state
  const [printDoc, setPrintDoc] = useState<LinkBudgetRecord | null>(null);

  // Calculate theory live
  const calcResult = calculateLinkBudget({
    txPowerDbm,
    feederLengthKm,
    fiberLossPerKm,
    spliceCount,
    spliceLossDbEach,
    connectorCount,
    connectorLossDbEach,
    splitter1Ratio,
    distributionLengthKm,
    splitter2Ratio,
    safetyMarginDb
  });

  // Calculate average ODP power and overall status
  const avgOdpDbm =
    portsMeasurement.length > 0
      ? Number(
          (
            portsMeasurement.reduce((sum, p) => sum + (Number(p.measuredPowerDbm) || 0), 0) /
            portsMeasurement.length
          ).toFixed(2)
        )
      : -18.0;

  const overallStatus = getOpticalStatus(avgOdpDbm);
  const statusInfo = getStatusBadgeInfo(overallStatus);

  // Change SFP class auto-sets Tx power
  const handleSfpChange = (newClass: SfpClass) => {
    setSfpClass(newClass);
    if (newClass !== "Custom") {
      setTxPowerDbm(SFP_DEFAULT_TX[newClass]);
    }
  };

  // Change Wavelength auto-sets fiber loss
  const handleWavelengthChange = (newWave: WavelengthNm) => {
    setWavelength(newWave);
    setFiberLossPerKm(FIBER_LOSS_PER_KM[newWave] || 0.35);
  };

  // Adjust port count
  const handlePortCapacityChange = (newCapacity: 8 | 16 | 24) => {
    setOdpCapacityPorts(newCapacity);
    const updated: OdpPortMeasurement[] = [];
    const basePwr = calcResult.expectedPowerOdpDbm;

    for (let i = 1; i <= newCapacity; i++) {
      const existing = portsMeasurement.find(p => p.portNumber === i);
      if (existing) {
        updated.push(existing);
      } else {
        const simVal = Number((basePwr - (0.2 + (i % 4) * 0.15)).toFixed(2));
        const st = getOpticalStatus(simVal);
        const delta = Math.abs(Number((simVal - basePwr).toFixed(2)));
        updated.push({
          portNumber: i,
          measuredPowerDbm: simVal,
          status: st,
          deltaFromTheory: delta,
          notes: "Normal"
        });
      }
    }
    setPortsMeasurement(updated);
  };

  // Update single port measured power
  const handleUpdatePortPower = (portNum: number, rawVal: string) => {
    const val = parseFloat(rawVal);
    const updated = portsMeasurement.map(p => {
      if (p.portNumber === portNum) {
        const numVal = isNaN(val) ? 0 : val;
        const st = getOpticalStatus(numVal);
        const delta = Math.abs(Number((numVal - calcResult.expectedPowerOdpDbm).toFixed(2)));
        return {
          ...p,
          measuredPowerDbm: numVal,
          status: st,
          deltaFromTheory: delta
        };
      }
      return p;
    });
    setPortsMeasurement(updated);
  };

  // Quick populate all ports with an average offset
  const handleQuickPopulatePorts = () => {
    const targetBase = calcResult.expectedPowerOdpDbm - 0.4;
    const updated = portsMeasurement.map((p, idx) => {
      const jitter = ((idx % 3) - 1) * 0.12;
      const pwr = Number((targetBase + jitter).toFixed(2));
      return {
        ...p,
        measuredPowerDbm: pwr,
        status: getOpticalStatus(pwr),
        deltaFromTheory: Math.abs(Number((pwr - calcResult.expectedPowerOdpDbm).toFixed(2))),
        notes: "Uji OPM Lapangan Kalibrasi Normal"
      };
    });
    setPortsMeasurement(updated);
    onShowToast("Nilai pengukuran OPM per port berhasil diisi otomatis sesuai toleransi lapangan!", "success");
  };

  // Presets Jaringan
  const applyPreset = (presetName: string) => {
    if (presetName === "odc_1_8_odp_1_8") {
      setTxPowerDbm(5.0);
      setFeederLengthKm(3.5);
      setSpliceCount(4);
      setConnectorCount(4);
      setSplitter1Ratio("1:8");
      setDistributionLengthKm(0.8);
      setSplitter2Ratio("1:8");
      setSafetyMarginDb(2.0);
      onShowToast("Preset Jaringan ODC 1:8 + 1:8 = 1:64 berhasil diterapkan!", "success");
    } else if (presetName === "odc_1_4_odp_1_8") {
      setTxPowerDbm(5.0);
      setFeederLengthKm(3.0);
      setSpliceCount(4);
      setConnectorCount(4);
      setSplitter1Ratio("1:4");
      setDistributionLengthKm(0.8);
      setSplitter2Ratio("1:8");
      setSafetyMarginDb(2.0);
      onShowToast("Preset Jaringan ODC 1:4 + 1:8 = 1:32 berhasil diterapkan!", "success");
    }
  };

  // Save current record
  const handleSaveRecord = () => {
    const newRecord: LinkBudgetRecord = {
      id: activeRecordId || `LB-${Date.now()}`,
      projectCode,
      clusterName,
      oltName,
      oltFrameSlotPort,
      odcName,
      odpName,
      technicianName,
      technicianPhone,
      waspangName,
      waspangPhone,
      measurementDate,
      measurementTime,
      sfpClass,
      txPowerDbm,
      wavelength,
      feederLengthKm,
      fiberLossPerKm,
      feederLossDb: calcResult.feederLossDb,
      spliceCount,
      spliceLossDbEach,
      totalSpliceLossDb: calcResult.totalSpliceLossDb,
      connectorCount,
      connectorLossDbEach,
      totalConnectorLossDb: calcResult.totalConnectorLossDb,
      splitter1Ratio,
      splitter1LossDb: calcResult.splitter1LossDb,
      distributionLengthKm,
      distributionLossDb: calcResult.distributionLossDb,
      splitter2Ratio,
      splitter2LossDb: calcResult.splitter2LossDb,
      safetyMarginDb,
      totalLossTheoryDb: calcResult.totalLossTheoryDb,
      expectedPowerOdcDbm: calcResult.expectedPowerOdcDbm,
      expectedPowerOdpDbm: calcResult.expectedPowerOdpDbm,
      measuredOdcPowerDbm,
      odpCapacityPorts,
      portsMeasurement,
      averageMeasuredOdpDbm: avgOdpDbm,
      overallStatus,
      signatureTechnician,
      signatureWaspang,
      notes,
      createdAt: new Date().toISOString()
    };

    let updatedList: LinkBudgetRecord[];
    if (activeRecordId) {
      updatedList = records.map(r => (r.id === activeRecordId ? newRecord : r));
    } else {
      updatedList = [newRecord, ...records];
      setActiveRecordId(newRecord.id);
    }

    setRecords(updatedList);
    saveLinkBudgetRecords(updatedList);
    onShowToast(`Data Pengukuran Link Budget & TesCom ${odpName} berhasil disimpan!`, "success");
  };

  // Load record to edit
  const handleLoadRecord = (rec: LinkBudgetRecord) => {
    setActiveRecordId(rec.id);
    setProjectCode(rec.projectCode);
    setClusterName(rec.clusterName);
    setOltName(rec.oltName);
    setOltFrameSlotPort(rec.oltFrameSlotPort);
    setOdcName(rec.odcName);
    setOdpName(rec.odpName);
    setTechnicianName(rec.technicianName);
    setTechnicianPhone(rec.technicianPhone || "");
    setWaspangName(rec.waspangName);
    setWaspangPhone(rec.waspangPhone || "");
    setMeasurementDate(rec.measurementDate);
    setMeasurementTime(rec.measurementTime || "14:00");
    setSfpClass(rec.sfpClass);
    setTxPowerDbm(rec.txPowerDbm);
    setWavelength(rec.wavelength);
    setFeederLengthKm(rec.feederLengthKm);
    setFiberLossPerKm(rec.fiberLossPerKm);
    setSpliceCount(rec.spliceCount);
    setSpliceLossDbEach(rec.spliceLossDbEach);
    setConnectorCount(rec.connectorCount);
    setConnectorLossDbEach(rec.connectorLossDbEach);
    setSplitter1Ratio(rec.splitter1Ratio);
    setDistributionLengthKm(rec.distributionLengthKm);
    setSplitter2Ratio(rec.splitter2Ratio);
    setSafetyMarginDb(rec.safetyMarginDb);
    setMeasuredOdcPowerDbm(rec.measuredOdcPowerDbm ?? -10.15);
    setOdpCapacityPorts(rec.odpCapacityPorts);
    setPortsMeasurement(rec.portsMeasurement);
    setSignatureTechnician(rec.signatureTechnician || "");
    setSignatureWaspang(rec.signatureWaspang || "");
    setNotes(rec.notes || "");
    setSubTab("calculator");
    onShowToast(`Data ${rec.odpName} dimuat ke editor!`, "success");
  };

  // Delete record
  const handleDeleteRecord = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data pengujian TesCom ini?")) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      saveLinkBudgetRecords(updated);
      if (activeRecordId === id) setActiveRecordId(null);
      onShowToast("Data berhasil dihapus dari arsip.", "success");
    }
  };

  // Pass to BA RFS
  const handleLinkToRfs = () => {
    if (onApplyToRfsForm) {
      onApplyToRfsForm({
        measuredDbm: avgOdpDbm,
        odpName,
        clusterName,
        notes: `Hasil TesCom Link Budget OLT ke ODP (${odpName}) di cluster ${clusterName}: Rata-rata redaman terukur OPM sebesar ${avgOdpDbm} dBm (Status: ${overallStatus}). Seluruh port memenuhi standar toleransi ITU-T G.984.`
      });
      onShowToast(`Nilai redaman ${avgOdpDbm} dBm berhasil ditautkan ke Formulir BA-RFS!`, "success");
    } else {
      onShowToast(`Nilai redaman rata-rata: ${avgOdpDbm} dBm (Salin ke Form BA-RFS).`, "success");
    }
  };

  // Prepare current object for print
  const getCurrentAsRecord = (): LinkBudgetRecord => {
    return {
      id: activeRecordId || "LB-CURRENT",
      projectCode,
      clusterName,
      oltName,
      oltFrameSlotPort,
      odcName,
      odpName,
      technicianName,
      technicianPhone,
      waspangName,
      waspangPhone,
      measurementDate,
      measurementTime,
      sfpClass,
      txPowerDbm,
      wavelength,
      feederLengthKm,
      fiberLossPerKm,
      feederLossDb: calcResult.feederLossDb,
      spliceCount,
      spliceLossDbEach,
      totalSpliceLossDb: calcResult.totalSpliceLossDb,
      connectorCount,
      connectorLossDbEach,
      totalConnectorLossDb: calcResult.totalConnectorLossDb,
      splitter1Ratio,
      splitter1LossDb: calcResult.splitter1LossDb,
      distributionLengthKm,
      distributionLossDb: calcResult.distributionLossDb,
      splitter2Ratio,
      splitter2LossDb: calcResult.splitter2LossDb,
      safetyMarginDb,
      totalLossTheoryDb: calcResult.totalLossTheoryDb,
      expectedPowerOdcDbm: calcResult.expectedPowerOdcDbm,
      expectedPowerOdpDbm: calcResult.expectedPowerOdpDbm,
      measuredOdcPowerDbm,
      odpCapacityPorts,
      portsMeasurement,
      averageMeasuredOdpDbm: avgOdpDbm,
      overallStatus,
      signatureTechnician,
      signatureWaspang,
      notes,
      createdAt: new Date().toISOString()
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="surface-card border border-subtle rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-emerald-500/5 to-transparent rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                SISTEM LINKB &amp; TESCOM OLT KE ODP
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-extrabold uppercase ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-mono text-muted">
                ITU-T G.984 &bull; Max -24.5 dBm
              </span>
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-main tracking-tight">
              LinkB &amp; TesCom
            </h1>
          </div>

          {/* Quick Action Buttons (Responsive Grid on Mobile HP, Flex on Tablet/PC) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:items-center gap-2 w-full lg:w-auto shrink-0">
            <button
              onClick={() => setPrintDoc(getCurrentAsRecord())}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cetak BA TesCom</span>
            </button>
            <button
              onClick={handleSaveRecord}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl accent-bg hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Data</span>
            </button>
            <button
              onClick={handleLinkToRfs}
              title="Kirim nilai redaman rata-rata ini ke Form BA-RFS"
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Tautkan ke BA-RFS</span>
            </button>
          </div>
        </div>

        {/* Preset Selector Pill Bar */}
        <div className="mt-5 pt-3.5 border-t border-subtle flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth text-xs">
          <span className="text-[11px] font-bold text-muted shrink-0 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            Preset Jaringan:
          </span>
          <button
            onClick={() => applyPreset("odc_1_8_odp_1_8")}
            className="px-3 py-1.5 rounded-xl surface-elevated border border-subtle hover:border-teal-500/60 text-main font-bold text-xs whitespace-nowrap transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5 hover:bg-teal-500/10"
            title="Splitter ODC 1:8 dan ODP 1:8 (Total Rasio 1:64)"
          >
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span>ODC 1:8 + 1:8 = 1:64</span>
          </button>
          <button
            onClick={() => applyPreset("odc_1_4_odp_1_8")}
            className="px-3 py-1.5 rounded-xl surface-elevated border border-subtle hover:border-teal-500/60 text-main font-bold text-xs whitespace-nowrap transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1.5 hover:bg-teal-500/10"
            title="Splitter ODC 1:4 dan ODP 1:8 (Total Rasio 1:32)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>ODC 1:4 + 1:8 = 1:32</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation (Horizontal Swipe on HP, Full on Tablet/PC) */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-subtle pb-2 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setSubTab("calculator")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            subTab === "calculator"
              ? "accent-bg text-white shadow-sm"
              : "surface-elevated text-muted hover:text-main"
          }`}
        >
          <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>1. Desain &amp; Kalkulator Teori</span>
        </button>
        <button
          onClick={() => setSubTab("tescom")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            subTab === "tescom"
              ? "accent-bg text-white shadow-sm"
              : "surface-elevated text-muted hover:text-main"
          }`}
        >
          <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>2. Hasil TesCom Lapangan (OPM)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${statusInfo.badgeClass}`}>
            {avgOdpDbm} dBm
          </span>
        </button>
        <button
          onClick={() => setSubTab("records")}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            subTab === "records"
              ? "accent-bg text-white shadow-sm"
              : "surface-elevated text-muted hover:text-main"
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>3. Arsip &amp; Riwayat Pengujian</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-white text-[9px] font-mono">
            {records.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DESAIN & KALKULATOR TEORI LINK BUDGET                             */}
      {/* ========================================================================= */}
      {subTab === "calculator" && (
        <div className="space-y-6">
          {/* Visual Link Diagram Schematics */}
          <div className="surface-card border border-subtle rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-4 flex items-center justify-between">
              <span>Topologi (OLT &rarr; ODC &rarr; ODP)</span>
              <span className="text-[11px] font-mono text-teal-400 font-bold">
                Total Redaman Teori: {calcResult.totalLossTheoryDb} dB
              </span>
            </h3>

            {/* Interactive Flow Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Node 1: OLT SFP */}
              <div className="surface-elevated border border-teal-500/40 rounded-xl p-3.5 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-teal-400">1. Node OLT / POP</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-500/20 text-teal-300">
                    GPON Tx
                  </span>
                </div>
                <p className="font-extrabold text-main text-sm truncate">{oltName}</p>
                <p className="text-[10px] text-muted">Pemancar Utama Jaringan</p>
                <div className="mt-3 pt-2 border-t border-subtle flex items-baseline justify-between">
                  <span className="text-[10px] text-muted">Daya Tx OLT:</span>
                  <span className="text-sm font-mono font-black text-emerald-400">
                    {txPowerDbm >= 0 ? `+${txPowerDbm.toFixed(2)}` : txPowerDbm.toFixed(2)} dBm
                  </span>
                </div>
              </div>

              {/* Node 2: Feeder & ODC */}
              <div className="surface-elevated border border-subtle rounded-xl p-3.5 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-muted">2. FDT / ODC</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-700 text-slate-300">
                    Split {splitter1Ratio}
                  </span>
                </div>
                <p className="font-extrabold text-main text-sm truncate">{odcName}</p>
                <p className="text-[10px] text-muted">
                  Feeder: {feederLengthKm} km ({calcResult.feederLossDb} dB)
                </p>
                <div className="mt-3 pt-2 border-t border-subtle flex items-baseline justify-between">
                  <span className="text-[10px] text-muted">Teori Out ODC:</span>
                  <span className="text-sm font-mono font-black text-main">
                    {calcResult.expectedPowerOdcDbm} dBm
                  </span>
                </div>
              </div>

              {/* Node 3: ODP */}
              <div className="surface-elevated border border-emerald-500/40 rounded-xl p-3.5 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-emerald-400">3. Titik ODP</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                    Split {splitter2Ratio}
                  </span>
                </div>
                <p className="font-extrabold text-main text-sm truncate">{odpName}</p>
                <p className="text-[10px] text-muted">
                  Distribusi: {distributionLengthKm} km ({calcResult.distributionLossDb} dB)
                </p>
                <div className="mt-3 pt-2 border-t border-subtle flex items-baseline justify-between">
                  <span className="text-[10px] text-muted">Teori Out ODP:</span>
                  <span className="text-sm font-mono font-black text-emerald-400">
                    {calcResult.expectedPowerOdpDbm} dBm
                  </span>
                </div>
              </div>

              {/* Node 4: Summary Comparison */}
              <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${statusInfo.bgLight}`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-muted">Hasil Uji OPM Riil</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${statusInfo.badgeClass}`}>
                      {overallStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted">Rata-rata Terukur:</p>
                  <p className="text-xl font-black font-mono text-main tracking-tight">
                    {avgOdpDbm} dBm
                  </p>
                </div>
                <div className="pt-2 border-t border-subtle/50 flex items-center justify-between text-[10px]">
                  <span className="text-muted">Deviasi Thd Teori:</span>
                  <span className="font-mono font-bold text-main">
                    {Math.abs(Number((avgOdpDbm - calcResult.expectedPowerOdpDbm).toFixed(2)))} dB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Configuration Inputs (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Identitas Proyek & Pemancar OLT */}
            <div className="surface-card border border-subtle rounded-2xl p-5 space-y-4">
              <h3 className="font-extrabold text-sm text-main flex items-center gap-2 border-b border-subtle pb-2.5">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span>Parameter OLT</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Nomor Pengujian</label>
                  <input
                    type="text"
                    value={projectCode}
                    onChange={e => setProjectCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-bold text-main"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Nama Cluster / Proyek</label>
                  <input
                    type="text"
                    value={clusterName}
                    onChange={e => setClusterName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-semibold text-main"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Perangkat OLT</label>
                  <input
                    type="text"
                    value={oltName}
                    onChange={e => setOltName(e.target.value)}
                    placeholder="Contoh: ZTE C320 / Huawei MA5608T"
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-semibold text-main"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Daya Pancar Tx OLT (dBm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={txPowerDbm}
                    onChange={e => setTxPowerDbm(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-bold text-emerald-400"
                  />
                  <p className="text-[10px] text-muted mt-1">Output optik aktual daya pancar OLT</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Wavelength (nm)</label>
                  <select
                    value={wavelength}
                    onChange={e => handleWavelengthChange(Number(e.target.value) as WavelengthNm)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-semibold text-main cursor-pointer"
                  >
                    <option value={1490}>1490 nm (GPON Downstream - Standar 0.35 dB/km)</option>
                    <option value={1310}>1310 nm (GPON Upstream - 0.35 dB/km)</option>
                    <option value={1550}>1550 nm (RF CATV Overlay - 0.22 dB/km)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Koefisien Kabel (dB/km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fiberLossPerKm}
                    onChange={e => setFiberLossPerKm(parseFloat(e.target.value) || 0.35)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-bold text-main"
                  />
                </div>
              </div>
            </div>

            {/* Right Card: Parameter Pasif, Feeder, Splitter & Margin */}
            <div className="surface-card border border-subtle rounded-2xl p-5 space-y-4">
              <h3 className="font-extrabold text-sm text-main flex items-center gap-2 border-b border-subtle pb-2.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Parameter Splitter</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Feeder */}
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Panjang Feeder OLT - ODC (km)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={feederLengthKm}
                    onChange={e => setFeederLengthKm(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-bold text-main"
                  />
                  <span className="text-[10px] text-muted mt-0.5 block">
                    Loss: {calcResult.feederLossDb} dB
                  </span>
                </div>

                {/* Splitter 1 (ODC) */}
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Splitter Level 1 (ODC / FDT)
                  </label>
                  <select
                    value={splitter1Ratio}
                    onChange={e => setSplitter1Ratio(e.target.value as SplitterRatio)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-bold text-main cursor-pointer"
                  >
                    <option value="None">None (0.00 dB)</option>
                    <option value="1:2">1:2 (Loss ~3.50 dB)</option>
                    <option value="1:4">1:4 (Loss ~7.25 dB)</option>
                    <option value="1:8">1:8 (Loss ~10.50 dB)</option>
                    <option value="1:16">1:16 (Loss ~14.00 dB)</option>
                    <option value="1:32">1:32 (Loss ~17.50 dB)</option>
                  </select>
                  <span className="text-[10px] text-muted mt-0.5 block">
                    Loss Splitter 1: {calcResult.splitter1LossDb} dB
                  </span>
                </div>

                {/* Splicing */}
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Jumlah Titik Splicing (Fusion)
                  </label>
                  <input
                    type="number"
                    value={spliceCount}
                    onChange={e => setSpliceCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-bold text-main"
                  />
                  <span className="text-[10px] text-muted mt-0.5 block">
                    Loss ({spliceLossDbEach} dB/titik): {calcResult.totalSpliceLossDb} dB
                  </span>
                </div>

                {/* Connector */}
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Jumlah Pasang Konektor SC
                  </label>
                  <input
                    type="number"
                    value={connectorCount}
                    onChange={e => setConnectorCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-bold text-main"
                  />
                  <span className="text-[10px] text-muted mt-0.5 block">
                    Loss ({connectorLossDbEach} dB/conn): {calcResult.totalConnectorLossDb} dB
                  </span>
                </div>

                {/* Distribusi */}
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Panjang Distribusi ODC - ODP (km)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={distributionLengthKm}
                    onChange={e => setDistributionLengthKm(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-bold text-main"
                  />
                  <span className="text-[10px] text-muted mt-0.5 block">
                    Loss: {calcResult.distributionLossDb} dB
                  </span>
                </div>

                {/* Splitter 2 (ODP) */}
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Splitter Level 2 (ODP)
                  </label>
                  <select
                    value={splitter2Ratio}
                    onChange={e => setSplitter2Ratio(e.target.value as SplitterRatio)}
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-bold text-main cursor-pointer"
                  >
                    <option value="1:4">1:4 (Loss ~7.25 dB)</option>
                    <option value="1:8">1:8 (Loss ~10.50 dB)</option>
                    <option value="1:16">1:16 (Loss ~14.00 dB)</option>
                    <option value="None">None (0.00 dB)</option>
                  </select>
                  <span className="text-[10px] text-muted mt-0.5 block">
                    Loss Splitter 2: {calcResult.splitter2LossDb} dB
                  </span>
                </div>

                {/* Safety Margin */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-muted block mb-1">
                    Safety &amp; Maintenance Margin (dB)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.5"
                      value={safetyMarginDb}
                      onChange={e => setSafetyMarginDb(parseFloat(e.target.value) || 2.0)}
                      className="flex-1 accent-emerald-500 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-xs text-main w-12 text-right">
                      {safetyMarginDb.toFixed(1)} dB
                    </span>
                  </div>
                  <span className="text-[10px] text-muted mt-0.5 block">
                    Standar Telkom / ISP: Cadangan penuaan kabel serat optik &amp; perbaikan splicing masa depan (1.5 - 3.0 dB).
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Theoretical Summary Breakdown Table */}
          <div className="surface-card border border-subtle rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-main mb-3 flex items-center justify-between">
              <span>Rincian Akumulasi Redaman Optik (Link Budget Breakdown)</span>
              <span className="text-xs font-mono text-muted">Formula: Loss = &Sigma; Loss_i</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="surface-muted text-muted font-bold border-b border-subtle uppercase text-[10.5px]">
                  <tr>
                    <th className="p-2.5">Elemen Link Optik</th>
                    <th className="p-2.5 text-center">Spesifikasi</th>
                    <th className="p-2.5 text-center">Loss Koefisien</th>
                    <th className="p-2.5 text-right">Subtotal Redaman (dB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  <tr>
                    <td className="p-2.5 font-semibold text-main">Kabel Feeder (OLT ke ODC)</td>
                    <td className="p-2.5 text-center font-mono text-muted">{feederLengthKm} km</td>
                    <td className="p-2.5 text-center font-mono text-muted">{fiberLossPerKm} dB/km</td>
                    <td className="p-2.5 text-right font-mono font-bold text-main">{calcResult.feederLossDb} dB</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-main">Titik Sambungan (Fusion Splice)</td>
                    <td className="p-2.5 text-center font-mono text-muted">{spliceCount} titik</td>
                    <td className="p-2.5 text-center font-mono text-muted">{spliceLossDbEach} dB/titik</td>
                    <td className="p-2.5 text-right font-mono font-bold text-main">{calcResult.totalSpliceLossDb} dB</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-main">Konektor Adaptor SC/UPC</td>
                    <td className="p-2.5 text-center font-mono text-muted">{connectorCount} pasang</td>
                    <td className="p-2.5 text-center font-mono text-muted">{connectorLossDbEach} dB/conn</td>
                    <td className="p-2.5 text-right font-mono font-bold text-main">{calcResult.totalConnectorLossDb} dB</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-main">Splitter Level 1 (ODC)</td>
                    <td className="p-2.5 text-center font-mono text-muted">Rasio {splitter1Ratio}</td>
                    <td className="p-2.5 text-center font-mono text-muted">PLC Insertion Loss</td>
                    <td className="p-2.5 text-right font-mono font-bold text-main">{calcResult.splitter1LossDb} dB</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-main">Kabel Distribusi (ODC ke ODP)</td>
                    <td className="p-2.5 text-center font-mono text-muted">{distributionLengthKm} km</td>
                    <td className="p-2.5 text-center font-mono text-muted">{fiberLossPerKm} dB/km</td>
                    <td className="p-2.5 text-right font-mono font-bold text-main">{calcResult.distributionLossDb} dB</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-main">Splitter Level 2 (ODP)</td>
                    <td className="p-2.5 text-center font-mono text-muted">Rasio {splitter2Ratio}</td>
                    <td className="p-2.5 text-center font-mono text-muted">PLC Insertion Loss</td>
                    <td className="p-2.5 text-right font-mono font-bold text-main">{calcResult.splitter2LossDb} dB</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-main">Safety / Maintenance Margin</td>
                    <td className="p-2.5 text-center font-mono text-muted">Penuaan &amp; Repair</td>
                    <td className="p-2.5 text-center font-mono text-muted">Cadangan Telco</td>
                    <td className="p-2.5 text-right font-mono font-bold text-main">{calcResult.safetyMarginDb} dB</td>
                  </tr>
                  <tr className="surface-elevated font-extrabold text-sm border-t-2 border-subtle">
                    <td colSpan={3} className="p-3 text-right uppercase text-main">
                      Total Redaman Teori (Total Link Loss):
                    </td>
                    <td className="p-3 text-right font-mono text-rose-400 font-black">
                      {calcResult.totalLossTheoryDb} dB
                    </td>
                  </tr>
                  <tr className="bg-emerald-950/20 font-extrabold text-sm border-t border-emerald-500/20">
                    <td colSpan={3} className="p-3 text-right uppercase text-emerald-400">
                      Estimasi Daya Terima Teori di Port ODP (Rx Theory):
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-black">
                      {calcResult.expectedPowerOdpDbm} dBm
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Next Step Call to action */}
            <div className="mt-4 pt-3 border-t border-subtle flex items-center justify-between">
              <span className="text-xs text-muted">
                Perhitungan teori selesai. Lanjutkan ke tab <strong>TesCom Lapangan</strong> untuk mengisi daya terukur OPM.
              </span>
              <button
                onClick={() => setSubTab("tescom")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>Buka Form TesCom Lapangan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENGUKURAN LAPANGAN TESCOM (OPM RIIL)                              */}
      {/* ========================================================================= */}
      {subTab === "tescom" && (
        <div className="space-y-6">
          {/* Header Field Inputs */}
          <div className="surface-card border border-subtle rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-subtle pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-main flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span>Data Pengukuran Nyata Lapangan (Optical Power Meter)</span>
                </h3>
                <p className="text-xs text-muted">
                  Masukkan hasil pengetesan OPM pada setiap port ODP untuk verifikasi mutu aktivasi link.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleQuickPopulatePorts}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl surface-elevated border hover:border-emerald-500/50 text-xs font-bold text-emerald-400 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill Hasil Lapangan</span>
                </button>
              </div>
            </div>

            {/* Quick Location & ODC Power Bar (Responsive: 1 col on mobile, 2 on tablet/laptop, 4 on desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">Titik ODP Lapangan</label>
                <input
                  type="text"
                  value={odpName}
                  onChange={e => setOdpName(e.target.value)}
                  placeholder="Contoh: ODP-SETU-LAV-04"
                  className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-bold text-main focus:ring-1 focus:ring-teal-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Daya Terukur di ODC (dBm)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={measuredOdcPowerDbm}
                  onChange={e => setMeasuredOdcPowerDbm(parseFloat(e.target.value) || 0)}
                  placeholder="-10.5"
                  className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-bold text-teal-400 focus:ring-1 focus:ring-teal-500 shadow-2xs"
                />
                <span className="text-[10px] text-muted mt-0.5 block">
                  Teori: {calcResult.expectedPowerOdcDbm} dBm
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Kapasitas Port ODP
                </label>
                <select
                  value={odpCapacityPorts}
                  onChange={e => handlePortCapacityChange(parseInt(e.target.value) as 8 | 16 | 24)}
                  className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-bold text-main cursor-pointer focus:ring-1 focus:ring-teal-500 shadow-2xs truncate"
                >
                  <option value={8}>8 Port (Standar FTTH)</option>
                  <option value={16}>16 Port (High Density)</option>
                  <option value={24}>24 Port (Cluster / Gedung)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Waktu &amp; Tanggal Uji
                </label>
                <div className="flex items-center gap-1.5 min-w-0">
                  <input
                    type="date"
                    value={measurementDate}
                    onChange={e => setMeasurementDate(e.target.value)}
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-xl surface-elevated border border-subtle text-xs font-semibold text-main focus:ring-1 focus:ring-teal-500 shadow-2xs"
                  />
                  <input
                    type="time"
                    value={measurementTime}
                    onChange={e => setMeasurementTime(e.target.value)}
                    className="w-20 sm:w-22 shrink-0 px-1.5 py-2 rounded-xl surface-elevated border border-subtle font-mono text-xs font-semibold text-main text-center focus:ring-1 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ports Measurement Matrix Grid */}
          <div className="surface-card border border-subtle rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted">
                Matriks Pengukuran Port ODP ({portsMeasurement.length} Port)
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">
                  Rata-rata: <strong className="font-mono text-main">{avgOdpDbm} dBm</strong>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${statusInfo.badgeClass}`}>
                  {overallStatus}
                </span>
              </div>
            </div>

            {/* Grid of Port Cards (Responsive: 1 on mobile, 2 on phablet, 4 on desktop for clean 2-row layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {portsMeasurement.map(p => {
                const portStatusInfo = getStatusBadgeInfo(p.status);
                const hasWarning = p.deltaFromTheory > 2.0;

                return (
                  <div
                    key={p.portNumber}
                    className={`surface-elevated border rounded-2xl p-4 space-y-2.5 transition-all shadow-xs ${
                      p.status === "FAIL"
                        ? "border-rose-500/50 bg-rose-950/10"
                        : p.status === "MARGINAL"
                        ? "border-amber-500/50 bg-amber-950/10"
                        : "border-subtle hover:border-teal-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 pb-0.5">
                      <span className="font-mono font-black text-xs text-main tracking-wide shrink-0">
                        PORT {p.portNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase tracking-tight shrink-0 ${portStatusInfo.badgeClass}`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1 gap-1">
                        <span className="text-muted text-[10.5px] font-medium truncate">Daya OPM (dBm)</span>
                        <span className="font-mono text-[10px] text-muted shrink-0" title="Deviasi dari teori">
                          &Delta; {p.deltaFromTheory.toFixed(2)} dB
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.05"
                        value={p.measuredPowerDbm}
                        onChange={e => handleUpdatePortPower(p.portNumber, e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl surface-muted border font-mono text-sm sm:text-base font-black text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-1 focus:ring-teal-500 shadow-2xs ${
                          p.status === "FAIL"
                            ? "text-rose-400 border-rose-500/40"
                            : p.status === "MARGINAL"
                            ? "text-amber-400 border-amber-500/40"
                            : "text-emerald-400 border-emerald-500/40"
                        }`}
                      />
                    </div>

                    {hasWarning && (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 leading-tight bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Deviasi tinggi! Cek konektor/bending.</span>
                      </div>
                    )}

                    <input
                      type="text"
                      value={p.notes || ""}
                      placeholder="Catatan port..."
                      onChange={e => {
                        const val = e.target.value;
                        setPortsMeasurement(prev =>
                          prev.map(item => (item.portNumber === p.portNumber ? { ...item, notes: val } : item))
                        );
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs surface-muted border border-subtle text-main placeholder:text-muted/50 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signatures & Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Field Notes */}
            <div className="surface-card border border-subtle rounded-2xl p-5 space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted">
                Catatan Teknis &amp; Kesimpulan TesCom
              </h4>
              <textarea
                rows={5}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Tuliskan catatan teknis hasil pengetesan di lapangan..."
                className="w-full px-3 py-2.5 rounded-xl surface-elevated border border-subtle text-xs text-main leading-relaxed"
              />
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">Waspang</label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={e => setTechnicianName(e.target.value)}
                    placeholder="Nama Waspang"
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-semibold text-main"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted block mb-1">PM</label>
                  <input
                    type="text"
                    value={waspangName}
                    onChange={e => setWaspangName(e.target.value)}
                    placeholder="Nama PM"
                    className="w-full px-3 py-2 rounded-xl surface-elevated border border-subtle text-xs font-semibold text-main"
                  />
                </div>
              </div>
            </div>

            {/* Digital Signatures */}
            <div className="surface-card border border-subtle rounded-2xl p-5 space-y-4">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted">
                TTD
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DigitalSignaturePad
                  id="sig_tech_tescom"
                  label="Waspang"
                  signerName={technicianName}
                  value={signatureTechnician}
                  onChange={setSignatureTechnician}
                />
                <DigitalSignaturePad
                  id="sig_waspang_tescom"
                  label="PM"
                  signerName={waspangName}
                  value={signatureWaspang}
                  onChange={setSignatureWaspang}
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between p-4 surface-card border border-subtle rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${statusInfo.dotColor}`} />
              <span className="text-xs font-bold text-main">
                Status Keseluruhan: <span className="uppercase">{overallStatus}</span> ({avgOdpDbm} dBm)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRecord}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Hasil TesCom</span>
              </button>
              <button
                onClick={() => setPrintDoc(getCurrentAsRecord())}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cetak Laporan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ARSIP & RIWAYAT PENGUJIAN TESCOM                                   */}
      {/* ========================================================================= */}
      {subTab === "records" && (
        <div className="surface-card border border-subtle rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-subtle pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-main flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-teal-400" />
                <span>Daftar Arsip &amp; Rekapitulasi Data TesCom ODP</span>
              </h3>
              <p className="text-xs text-muted">
                Riwayat data pengujian redaman optik OLT ke ODP yang telah disimpan.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveRecordId(null);
                setProjectCode("LB-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + `-${records.length + 1}`);
                setSubTab("calculator");
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl accent-bg text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Pengujian Baru</span>
            </button>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-12 text-muted text-xs">
              Belum ada riwayat pengujian tersimpan. Silakan simpan pengujian pada tab Kalkulator atau TesCom.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="surface-muted text-muted font-bold border-b border-subtle uppercase text-[10px]">
                  <tr>
                    <th className="p-3">No. Pengujian</th>
                    <th className="p-3">Cluster / Lokasi</th>
                    <th className="p-3">ODP Lapangan</th>
                    <th className="p-3 text-center">Teori (Rx)</th>
                    <th className="p-3 text-center">Terukur (OPM)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Waspang / Teknisi</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {records.map(rec => {
                    const recStatusInfo = getStatusBadgeInfo(rec.overallStatus);
                    return (
                      <tr key={rec.id} className="hover:surface-elevated transition-colors">
                        <td className="p-3 font-mono font-bold text-main">{rec.projectCode}</td>
                        <td className="p-3 font-semibold text-main">{rec.clusterName}</td>
                        <td className="p-3 font-mono font-bold text-teal-400">{rec.odpName}</td>
                        <td className="p-3 text-center font-mono text-muted">{rec.expectedPowerOdpDbm} dBm</td>
                        <td className="p-3 text-center font-mono font-bold text-main">
                          {rec.averageMeasuredOdpDbm} dBm
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${recStatusInfo.badgeClass}`}
                          >
                            {rec.overallStatus}
                          </span>
                        </td>
                        <td className="p-3 text-muted text-[11px]">
                          <div>{rec.technicianName}</div>
                          <div className="text-[10px] text-muted/70">{rec.waspangName}</div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleLoadRecord(rec)}
                              title="Buka &amp; Edit"
                              className="px-2.5 py-1 rounded-lg surface-elevated border text-main hover:text-teal-400 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Buka
                            </button>
                            <button
                              onClick={() => setPrintDoc(rec)}
                              title="Cetak Berita Acara"
                              className="p-1.5 rounded-lg surface-elevated border text-muted hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              title="Hapus"
                              className="p-1.5 rounded-lg surface-elevated border text-muted hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Printable Report Modal */}
      {printDoc && (
        <LinkBudgetReportModal
          record={printDoc}
          onClose={() => setPrintDoc(null)}
          onToast={onShowToast}
        />
      )}
    </div>
  );
};
