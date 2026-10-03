import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="empty-stage">
      <div className="surface-card px-8 py-10 max-w-sm">
        <p className="section-label">Missing page</p>
        <h1 className="mt-2 text-3xl font-semibold">404</h1>
        <p className="empty-copy">That page is not part of the clubhouse.</p>
        <Link to="/" className="text-button mt-4">Back to the squad</Link>
      </div>
    </div>
  );
};

export default NotFound;
