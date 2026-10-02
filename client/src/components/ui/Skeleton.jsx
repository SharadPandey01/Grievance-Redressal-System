import { classNames } from '../../lib/classNames';

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
  ...props
}) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-lg';
      case 'card':
        return 'rounded-xl h-36 w-full';
      case 'text':
      default:
        return 'rounded-md h-4 w-full';
    }
  };

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((key) => (
        <div
          key={key}
          className={classNames(
            'animate-pulse bg-slate-200/80',
            getVariantClasses(),
            className
          )}
          style={{
            width: width,
            height: height,
          }}
          aria-hidden="true"
          {...props}
        />
      ))}
    </>
  );
}

export default Skeleton;
