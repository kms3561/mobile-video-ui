import { AuthButton } from './AuthButton';
import { useAuth } from './AuthContext';

type ProtectedActionButtonProps = {
  actionLabel: string;
  description?: string;
  label: string;
  onAllowed?: () => void;
  variant?: 'primary' | 'secondary';
};

export function ProtectedActionButton({
  actionLabel,
  description,
  label,
  onAllowed,
  variant,
}: ProtectedActionButtonProps) {
  const { requireAuth } = useAuth();

  function handlePress() {
    if (
      requireAuth({
        actionLabel,
        description,
        onReady: onAllowed,
      })
    ) {
      onAllowed?.();
    }
  }

  return <AuthButton label={label} onPress={handlePress} variant={variant} />;
}
