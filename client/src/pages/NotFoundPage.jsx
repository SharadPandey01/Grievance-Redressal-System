import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import { Button, Card } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center shadow-lg">
        <Card.Content className="p-8 space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <FileQuestion className="h-10 w-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              404 Error
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Page Not Found
            </h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              The page you are looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link to="/">
              <Button variant="primary" icon={Home}>
                Return Home
              </Button>
            </Link>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

export default NotFoundPage;
