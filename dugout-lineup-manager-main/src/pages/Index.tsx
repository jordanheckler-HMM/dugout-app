import { DugoutLayout } from '@/components/dugout/DugoutLayout';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Dugout - Baseball Coaching Workspace</title>
        <meta name="description" content="A local desk for building lineups, depth charts, and defensive alignments." />
      </Helmet>
      <DugoutLayout />
    </>
  );
};

export default Index;
