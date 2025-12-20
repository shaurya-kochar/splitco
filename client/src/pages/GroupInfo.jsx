import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroupDetails, exportCSV, exportJSON } from '../api/groups';
import Toast from '../components/Toast';

export default function GroupInfo() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const loadGroup = async () => {
      try {
        setIsLoading(true);
        const res = await getGroupDetails(groupId);
        setGroup(res.group);
      } catch (err) {
        setError(err.message || 'Failed to load group info');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGroup();
  }, [groupId]);

  const formatPhone = (phone) => {
    // +919876543210 -> +91 98765 43210
    if (phone.startsWith('+91')) {
      const number = phone.slice(3);
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    }
    return phone;
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const blob = await exportCSV(groupId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splitco_${group.name}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToastMessage('CSV exported successfully');
      setShowToast(true);
    } catch (err) {
      setToastMessage(err.message || 'Export failed');
      setShowToast(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const response = await exportJSON(groupId);
      const data = response.exportData;
      
      // Generate simple text-based PDF content
      let pdfContent = `${data.group.name}\n`;
      pdfContent += `Export Date: ${new Date(data.exportDate).toLocaleString()}\n\n`;
      pdfContent += `=== MEMBERS ===\n`;
      data.members.forEach(m => {
        pdfContent += `${m.name} (${m.phone})\n`;
      });
      pdfContent += `\n=== EXPENSES ===\n`;
      data.expenses.forEach(e => {
        pdfContent += `${new Date(e.createdAt).toLocaleDateString()} - ₹${e.amount}\n`;
        pdfContent += `  Description: ${e.description || 'N/A'}\n`;
        pdfContent += `  Splits: ${e.splits.map(s => `${s.userName}: ₹${s.shareAmount}`).join(', ')}\n\n`;
      });
      pdfContent += `\n=== SETTLEMENTS ===\n`;
      data.settlements.forEach(s => {
        pdfContent += `${new Date(s.createdAt).toLocaleDateString()} - ₹${s.amount}\n`;
        pdfContent += `  ${s.fromUserName} → ${s.toUserName}\n\n`;
      });
      pdfContent += `\n=== CURRENT BALANCES ===\n`;
      data.balances.forEach(b => {
        const status = b.balance > 0 ? `gets back ₹${b.balance}` : b.balance < 0 ? `owes ₹${Math.abs(b.balance)}` : 'settled';
        pdfContent += `${b.userName}: ${status}\n`;
      });

      // Download as text file (PDF generation requires library)
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splitco_${group.name}_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToastMessage('Report exported successfully');
      setShowToast(true);
    } catch (err) {
      setToastMessage(err.message || 'Export failed');
      setShowToast(true);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
          <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
              Group Info
            </h1>
            <div className="w-6" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-text-muted)]/30 border-t-[var(--color-text-muted)] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
        <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
          <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
              Group Info
            </h1>
            <div className="w-6" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-[var(--color-error)] mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isDirectSplit = group.type === 'direct';
  const title = isDirectSplit ? group.displayName : group.name;

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-lg border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">
            Group Info
          </h1>
          <div className="w-6" />
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full">
        {/* Group Name */}
        <div className="px-6 py-6 border-b border-[var(--color-border-subtle)]">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-1">
            {title}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        {/* Members List */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
            Members
          </h3>
          <div className="space-y-4">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 py-2"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-base font-medium text-[var(--color-text-secondary)] shrink-0">
                  {(member.name || member.phone).slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)] truncate">
                    {member.name || 'No name'}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] truncate">
                    {formatPhone(member.phone)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Section */}
        <div className="px-6 py-4 border-t border-[var(--color-border-subtle)]">
          <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
            Export Data
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] font-medium hover:bg-[var(--color-accent-subtle)] hover:border-[var(--color-accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export as CSV'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] font-medium hover:bg-[var(--color-accent-subtle)] hover:border-[var(--color-accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {isExporting ? 'Exporting...' : 'Export Report'}
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            Export all expenses, settlements, and balances for this group
          </p>
        </div>
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
