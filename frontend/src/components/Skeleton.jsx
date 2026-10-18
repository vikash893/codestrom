import React from 'react';

export const Skeleton = ({ width = '100%', height = '1rem', borderRadius = '6px', style = {}, className = '' }) => (
  <div
    className={`skeleton ${className}`}
    style={{
      width,
      height,
      borderRadius,
      ...style,
    }}
  />
);

export const SkeletonCard = ({ height = '140px', style = {} }) => (
  <div
    className="card"
    style={{
      background: '#ffffff',
      borderRadius: '10px',
      padding: '1.25rem',
      border: '1px solid #e2e8f0',
      marginBottom: '1rem',
      ...style,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
      <Skeleton width="45%" height="1.2rem" />
      <Skeleton width="20%" height="1.2rem" borderRadius="12px" />
    </div>
    <Skeleton width="80%" height="0.85rem" style={{ marginBottom: '0.5rem' }} />
    <Skeleton width="60%" height="0.85rem" style={{ marginBottom: '1rem' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Skeleton width="25%" height="1.4rem" />
      <Skeleton width="30%" height="1.8rem" borderRadius="6px" />
    </div>
  </div>
);

export const SkeletonRow = ({ count = 3 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: '#ffffff', borderRadius: '6px' }}>
        <Skeleton width="36px" height="36px" borderRadius="8px" />
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height="0.9rem" style={{ marginBottom: '0.35rem' }} />
          <Skeleton width="70%" height="0.75rem" />
        </div>
        <Skeleton width="18%" height="1rem" borderRadius="12px" />
      </div>
    ))}
  </div>
);

export const SkeletonTriage = () => (
  <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
      <div>
        <Skeleton width="180px" height="1.25rem" style={{ marginBottom: '0.35rem' }} />
        <Skeleton width="120px" height="0.8rem" />
      </div>
      <Skeleton width="140px" height="1.6rem" borderRadius="12px" />
    </div>

    {/* Symptoms pills */}
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
      <Skeleton width="75px" height="1.4rem" borderRadius="12px" />
      <Skeleton width="95px" height="1.4rem" borderRadius="12px" />
      <Skeleton width="85px" height="1.4rem" borderRadius="12px" />
    </div>

    {/* Differential Condition boxes */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
      <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <Skeleton width="50%" height="1rem" />
          <Skeleton width="20%" height="1rem" />
        </div>
        <Skeleton width="90%" height="0.8rem" style={{ marginBottom: '0.35rem' }} />
        <Skeleton width="70%" height="0.8rem" />
      </div>
      <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <Skeleton width="45%" height="1rem" />
          <Skeleton width="20%" height="1rem" />
        </div>
        <Skeleton width="85%" height="0.8rem" style={{ marginBottom: '0.35rem' }} />
        <Skeleton width="60%" height="0.8rem" />
      </div>
    </div>

    {/* First Aid & Medicines */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      <Skeleton height="70px" borderRadius="8px" />
      <Skeleton height="70px" borderRadius="8px" />
    </div>
  </div>
);

export const SkeletonQueueItem = () => (
  <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Skeleton width="130px" height="1.5rem" borderRadius="12px" />
        <Skeleton width="180px" height="1.5rem" borderRadius="4px" />
      </div>
      <Skeleton width="120px" height="0.85rem" />
    </div>
    <Skeleton width="85%" height="0.9rem" style={{ marginBottom: '0.5rem' }} />
    <Skeleton width="60%" height="0.9rem" style={{ marginBottom: '1rem' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
      <Skeleton width="160px" height="1.6rem" borderRadius="6px" />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Skeleton width="80px" height="1.6rem" borderRadius="6px" />
        <Skeleton width="90px" height="1.6rem" borderRadius="6px" />
      </div>
    </div>
  </div>
);

export const SkeletonOrderItem = () => (
  <div className="card" style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div>
        <Skeleton width="160px" height="1.1rem" style={{ marginBottom: '0.35rem' }} />
        <Skeleton width="220px" height="0.8rem" />
      </div>
      <Skeleton width="100px" height="1.4rem" borderRadius="12px" />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', margin: '1rem 0' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <Skeleton width="26px" height="26px" borderRadius="50%" />
          <Skeleton width="50px" height="0.65rem" />
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
      <Skeleton width="40%" height="1.2rem" />
      <Skeleton width="20%" height="1.2rem" />
    </div>
  </div>
);
