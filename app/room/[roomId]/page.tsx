import RoomPageClient from '../../../components/RoomPageClient';

interface RoomPageProps {
  params: {
    roomId: string;
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  return <RoomPageClient roomId={params.roomId} />;
}
