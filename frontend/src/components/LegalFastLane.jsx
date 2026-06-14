import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import { LeadCaptureButton } from './LeadCaptureButton';
import { useAuth } from '@/context/AuthContext';
import { getDischargeTier } from '@/data/dischargeTypes';

export function LegalFastLane() {
  const { user } = useAuth();
  const tier = getDischargeTier(user?.discharge);

  if (tier === 'green') return null;

  return (
    <Card className="border-2 border-amber-300 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50" data-testid="legal-fast-lane">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Scale className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-sm font-bold text-amber-900">Upgrade Your Discharge — Free Legal Help Available</h3>
          <p className="text-xs text-amber-700 mt-0.5">Veterans with your discharge type have successfully upgraded. A legal expert can review your case at no cost.</p>
        </div>
        <LeadCaptureButton category="legal" resourceName="Discharge Upgrade Legal Consultation" label="Connect With a Lawyer" className="bg-amber-600 hover:bg-amber-700 text-white border-0 shrink-0" variant="default" />
      </CardContent>
    </Card>
  );
}
