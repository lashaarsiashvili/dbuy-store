import React from 'react';
import { PostHogAnalyticsDashboard } from './PostHogAnalyticsDashboard';

export const AdminAnalytics: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <PostHogAnalyticsDashboard />
    </div>
  );
};

export default AdminAnalytics;
