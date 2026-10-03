import { Link } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import { PageHeader, Card, Button, Badge } from '../components/ui';

export function PageStub({
  title = 'Module',
  subtitle = 'Module view scheduled for subsequent phase.',
  promptLabel = 'Upcoming Phase',
  breadcrumbs = [{ label: 'Home', href: '/' }],
  description,
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={subtitle}
        breadcrumbs={breadcrumbs}
        badge={<Badge variant="indigo">{promptLabel}</Badge>}
      />

      <Card className="border-dashed border-slate-300 bg-white/70">
        <Card.Content className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Layers className="h-7 w-7" />
          </div>

          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-semibold text-slate-800">
              {title} Screen Stub
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {description ||
                'This route has been configured and secured in the routing architecture. Full UI interactions will be hooked up in the corresponding frontend task.'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link to="/ui-kit">
              <Button variant="outline" size="sm" icon={ArrowRight} iconPosition="right">
                View UI Component Kit
              </Button>
            </Link>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

export default PageStub;
