import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const TrialBanner: React.FC = () => {
  const [trial, setTrial] = useState<any>(null);
  const [hwid, setHwid] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('hwid');
    if (stored) {
      setHwid(stored);
      fetch(`${API_BASE_URL}/license/trial/status?hardwareId=${stored}`)
        .then(r => r.json())
        .then(data => {
          if (data.hasTrial && data.status === 'active') {
            setTrial(data);
          }
        })
        .catch(() => {});
    }
  }, []);

  if (!trial || dismissed) return null;

  const hours = trial.remainingHours || 0;
  const mins = trial.remainingMins || 0;
  const isUrgent = hours < 6;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium border-b ${
      isUrgent
        ? 'bg-accent-rose/10 border-accent-rose/20 text-accent-rose'
        : 'bg-accent-amber/10 border-accent-amber/20 text-accent-amber'
    }`}>
      {isUrgent ? <AlertTriangle size={14} /> : <Clock size={14} />}
      <span className="flex-1">
        Trial: <strong>{hours}h {mins}m</strong> remaining.
        <span className="ml-2 text-gray-400">Purchase a license to continue after expiry.</span>
      </span>
      <button onClick={() => setDismissed(true)} className="text-gray-500 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};
