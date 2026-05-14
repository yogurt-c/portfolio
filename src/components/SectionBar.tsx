export default function SectionBar({ count }: { count: number }) {
  return (
    <div className="section-bar">
      <div className="lhs">
        <b>Selected work</b> &nbsp;/&nbsp; backend · distributed systems
      </div>
      <div className="rhs">{String(count).padStart(2, "0")} projects</div>
    </div>
  );
}
