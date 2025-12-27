import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FollowUpsPage() {
  const navigate = useNavigate();

  // Redirect to Command Center
  useEffect(() => {
    console.log('FollowUpsPage: Redirecting to Command Center (deprecated page)');
    navigate('/command');
  }, [navigate]);

  // Early return - zeige kurz Loading
  return (
    <div className="flex items-center justify-center h-screen bg-[#0a0f1a]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Weiterleitung zum Command Center...</p>
      </div>
    </div>
  );
}