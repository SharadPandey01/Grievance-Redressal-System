import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { EmptyState, Button, PageHeader } from '../components/ui';

export function PlaceholderPage({ title = 'Coming Soon', feature = 'This module' }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`${feature} will be implemented in subsequent prompts.`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: title },
        ]}
      />
      <EmptyState
        icon={Construction}
        title={`${title} In Progress`}
        description={`${feature} is scheduled for development in the upcoming frontend phases.`}
        action={
          <Link to="/ui-kit">
            <Button variant="outline" size="sm">
              Explore UI Kit
            </Button>
          </Link>
        }
      />
    </div>
  );
}

export default PlaceholderPage;
