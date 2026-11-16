const Spinner = ({ size = 18, className = '' }) => (
    <span
        className={`material-symbols-outlined animate-spin inline-block leading-none ${className}`}
        style={{ fontSize: size }}
        aria-hidden="true"
    >
        progress_activity
    </span>
);

export default Spinner;