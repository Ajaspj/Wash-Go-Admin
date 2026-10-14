import React from 'react';

export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ width = '100%', height = '20px', className = '', style }) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} style={{ display: 'flex', gap: '16px' }}>
          {Array.from({ length: columns }).map((_, cIdx) => (
            <Skeleton key={cIdx} height="28px" style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
};
