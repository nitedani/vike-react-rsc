import CounterClient from './CounterClient';
import { getCount } from '../../actions/counter';
import { counterStyles } from './styles';

export default async function Counter() {
  // Get the initial count from the server
  const counterState = await getCount();

  return (
    <div css={counterStyles.container}>
      <div css={counterStyles.gradientBar} />

      <CounterClient initialCount={counterState.count} />

      <p css={counterStyles.description}>
        Client-side interactivity with React
      </p>
    </div>
  );
}
