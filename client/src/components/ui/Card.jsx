import { classNames } from '../../lib/classNames';

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={classNames(
        'rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow',
        hover ? 'hover:shadow-md' : '',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className = '', ...props }) {
  return (
    <div
      className={classNames('px-6 py-5 border-b border-slate-100 flex flex-col gap-1', className)}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className = '', as: Component = 'h3', ...props }) {
  return (
    <Component
      className={classNames('text-lg font-semibold text-slate-900 tracking-tight', className)}
      {...props}
    >
      {children}
    </Component>
  );
};

Card.Description = function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={classNames('text-sm text-slate-500', className)} {...props}>
      {children}
    </p>
  );
};

Card.Content = function CardContent({ children, className = '', ...props }) {
  return (
    <div className={classNames('p-6', className)} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={classNames('px-6 py-4 bg-slate-50/70 border-t border-slate-100 rounded-b-xl flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
