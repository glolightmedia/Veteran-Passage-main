import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HandHelping, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { trackEvent } from '@/utils/analytics';

const API = process.env.REACT_APP_BACKEND_URL;

export function LeadCaptureButton({ category, resourceName, label, variant = "outline", className = "" }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setSending(true);
    trackEvent('lead_submitted', { category, resource_name: resourceName });
    try {
      await axios.post(`${API}/api/intelligence/request-help`, {
        category, resource_name: resourceName || category, message: msg
      }, { withCredentials: true });
      setSent(true);
      toast.success("Request submitted! A partner will reach out soon.");
      setTimeout(() => { setOpen(false); setSent(false); setMsg(''); }, 2000);
    } catch { toast.error('Failed — please try again'); }
    setSending(false);
  };

  return (
    <>
      <Button variant={variant} size="sm" className={`rounded-xl ${className}`} onClick={() => setOpen(true)} data-testid={`lead-btn-${category}`}>
        <HandHelping className="w-3.5 h-3.5 mr-1" /> {label || 'Get Help'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          {sent ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground">Request Sent!</h3>
              <p className="text-sm text-muted-foreground mt-1">A partner will reach out to you soon.</p>
            </div>
          ) : (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><HandHelping className="w-5 h-5" /> Get Personal Help</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">We'll connect you with a verified partner who specializes in {category?.replace('-', ' ')}.</p>
              <Textarea placeholder="What do you need help with? (optional)" value={msg} onChange={e => setMsg(e.target.value)} rows={3} className="rounded-lg" data-testid="lead-message" />
              <Button className="w-full rounded-xl bg-secondary hover:bg-secondary/90" onClick={submit} disabled={sending} data-testid="lead-submit">
                {sending ? 'Submitting...' : 'Request Help — Free'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">No cost to you. Partners provide free or low-cost services.</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
