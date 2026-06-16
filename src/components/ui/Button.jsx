export default function Button({ children, variant = 'primary', size = 'md', onClick, className = '', disabled, type = 'button' }) {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1';
  const variants = {
    primary: 'bg-brand text-[#1C1C1C] hover:bg-yellow-400 focus:ring-brand disabled:opacity-50',
    secondary: 'bg-white text-[#1C1C1C] border border-gray-200 hover:bg-gray-50 focus:ring-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-200',
    dark: 'bg-[#1C1C1C] text-white hover:bg-gray-800 focus:ring-gray-400',
  };
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-sm px-6 py-3',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}
