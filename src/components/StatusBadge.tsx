import { CheckCircle2, Clock, CircleDashed, AlertTriangle, Info } from 'lucide-react';
import { CheckpointStatus, StageStatus } from '../types/lms';

export function StageStatusText({ status }: { status: StageStatus }) {
  if (status === 'selesai') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Selesai</span>
      </span>
    );
  }
  if (status === 'sedang_dipelajari') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3569B0]">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>Sedang Dipelajari</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <CircleDashed className="h-3.5 w-3.5 shrink-0" />
      <span>Belum Dimulai</span>
    </span>
  );
}

export function CheckpointStatusText({ status }: { status: CheckpointStatus }) {
  if (status === 'berhasil') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        <span>BERHASIL</span>
      </span>
    );
  }
  if (status === 'perlu_diperbaiki') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span>PERLU DIPERBAIKI</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
      <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span>Belum Dikerjakan</span>
    </span>
  );
}
