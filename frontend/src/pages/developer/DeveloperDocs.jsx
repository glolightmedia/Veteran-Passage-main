import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, Globe, Key, Shield, FileText } from 'lucide-react';
import RoleLayout from '@/components/RoleLayout';
import { devNav } from './DeveloperConsole';

const endpoints = [
  { method: 'GET', path: '/api/developer/public/resources', desc: 'List approved resources', params: 'category (optional), limit (1-50)' },
  { method: 'GET', path: '/api/developer/public/stats', desc: 'Platform statistics', params: 'none' },
];

const METHOD_COLORS = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function DeveloperDocs() {
  return (
    <RoleLayout navItems={devNav} roleLabel="Developer" roleColor="bg-purple-100 text-purple-700">
      <div className="space-y-6 max-w-3xl" data-testid="developer-docs-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
          <p className="text-sm text-muted-foreground mt-1">Reference for the Veteran Passage public API</p>
        </div>

        <Card className="rounded-xl border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" /> Authentication</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">All public API requests require an API key passed via the <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">X-API-Key</code> header.</p>
            <div className="p-3 bg-muted/50 rounded-lg font-mono text-xs">
              <span className="text-muted-foreground">curl -H </span>
              <span className="text-foreground">"X-API-Key: vp_your_key_here"</span>
              <span className="text-muted-foreground"> \</span><br />
              <span className="text-muted-foreground">  </span>
              <span className="text-foreground">https://veteranpassage.org/api/developer/public/resources</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Public Endpoints</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {endpoints.map((ep, i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-xs font-mono rounded ${METHOD_COLORS[ep.method]}`}>{ep.method}</Badge>
                    <code className="text-sm font-mono text-foreground">{ep.path}</code>
                  </div>
                  <p className="text-sm text-muted-foreground">{ep.desc}</p>
                  <p className="text-xs text-muted-foreground mt-1"><strong>Parameters:</strong> {ep.params}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Rate Limits</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>Maximum <strong>5 API keys</strong> per developer account</li>
              <li>Request counts are tracked per key</li>
              <li>Revoked keys cannot be reactivated</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-xl border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Response Format</CardTitle></CardHeader>
          <CardContent>
            <div className="p-3 bg-muted/50 rounded-lg font-mono text-xs whitespace-pre">{`{
  "resources": [
    {
      "name": "Swords to Plowshares Legal Services",
      "description": "Free legal assistance...",
      "categories": ["legal"],
      "eligibility": "All veterans",
      "url": "https://example.org",
      "phone": "415-252-4788",
      "status": "approved",
      "is_promoted": false
    }
  ],
  "count": 1
}`}</div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
