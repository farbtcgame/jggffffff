import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export const AdminNav: React.FC = () => {
  const router = useRouter();

  const links = [
    { label: 'OVERVIEW', path: '/admin/overview' },
    { label: 'MINT CONTROL', path: '/admin/mint' },
    { label: 'PAYMENT', path: '/admin/payment' },
    { label: 'REVEAL', path: '/admin/reveal' },
    { label: 'ROYALTY', path: '/admin/royalty' },
    { label: 'BURN LAB', path: '/admin/burn' },
    { label: 'STAKING', path: '/admin/staking' },
    { label: 'CLOCK IN', path: '/admin/clockin' },
    { label: 'CONTRACT', path: '/admin/contract' },
  ];

  return (
    <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar mb-6">
      {links.map((link) => {
        const isActive = router.pathname === link.path;
        return (
          <Link
            key={link.path}
            href={link.path}
            className={`px-4 py-2 text-xs tracking-widest whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'border-neon text-neon font-bold bg-white/[0.04]/30'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
};
