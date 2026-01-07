import { DugoutLayout } from '@/components/dugout/DugoutLayout';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Dugout - Baseball Coaching Workspace</title>
        <meta name="description" content="A visual, coach-controlled workspace for building lineups and defensive positioning. Dugout feels like a digital lineup card with an AI advisor for perspective." />
      </Helmet>
      <DugoutLayout />
    </>
  );
};

export default Index;
