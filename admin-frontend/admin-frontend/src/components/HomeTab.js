import React from "react";
import StatCard from "./StatCard";

function HomeTab({ stats }) {
  return (
    <div className="home-tab">
      {/* Stats Overview card*/}
      <div className="stats-grid">
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard title="Pending Reviews" value={stats.pendingReviews} />
        <StatCard title="Pending Appeals" value={stats.pendingAppeals} />
        <StatCard title="Today's Reports" value={stats.todaysReports} />
        <StatCard title="Banned Users" value={stats.bannedUsers} />
        <StatCard
          title="Today's Verified Reports"
          value={stats.verifiedReports}
        />
      </div>
    </div>
  );
}

export default HomeTab;
