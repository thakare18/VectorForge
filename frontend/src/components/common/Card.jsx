export default function Card({ children, className = "", hover = false }) {
  return (
    <div
      className={`glass-card p-6 ${hover ? "card-hover-line transition-transform hover:-translate-y-0.5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
