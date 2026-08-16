import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Web3Provider } from '../context/Web3Context';
import { StakingProvider } from '../context/StakingContext';
import { ClockInProvider } from '../context/ClockInContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Web3Provider>
      <StakingProvider>
        <ClockInProvider>
          <Component {...pageProps} />
        </ClockInProvider>
      </StakingProvider>
    </Web3Provider>
  );
}
