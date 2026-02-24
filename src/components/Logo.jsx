const Logo = ({ className, variant = 'dark' }) => (
  <img
    className={className}
    src={variant === 'white' ? '/images/logo-white.png' : '/images/logo-dark.png'}
    alt="PrettyBoy"
  />
)

export default Logo