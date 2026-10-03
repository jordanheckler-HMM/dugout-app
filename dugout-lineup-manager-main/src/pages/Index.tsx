import { DugoutLayout } from '@/components/dugout/DugoutLayout';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Dugout - Baseball Coaching Workspace</title>
        <meta name="description" content="A focused baseball coaching workspace for managing your roster, building lineups, and setting defensive positions." />
      </Helmet>
      <DugoutLayout />
    </>
  );
};

export default Index;
