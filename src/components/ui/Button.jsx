export default function Button({ children, variant = 'primary', size = 'md', onClick, className = '', disabled, type = 'button', icon: Icon }) {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1';
  const variants = {
    primary: 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 focus:ring-yellow-400 disabled:opacity-50',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-200',
    dark: 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-400',
  };
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-sm px-6 py-3',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
