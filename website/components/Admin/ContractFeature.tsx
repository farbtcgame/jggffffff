import React from 'react';

export const ContractFeatureStatus: React.FC<{
  isSupported: boolean;
  featureName: string;
}> = ({ isSupported, featureName }) => {
  if (isSupported) return null;

  return (
    <div className="p-3 border border-amber-900/50 bg-amber-950/20 text-amber-400 text-xs my-2 flex items-center space-x-2">
      <span>⚠️</span>
      <span>{featureName} is not available in the provided smart contract ABI.</span>
    </div>
  );
};
