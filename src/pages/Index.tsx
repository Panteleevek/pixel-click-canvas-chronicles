
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { GameCanvas } from '@/components/GameCanvas';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">Пиксель-Кликер</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Добро пожаловать, {user.email}</span>
            <Button onClick={signOut} variant="outline">
              Выйти
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto py-8">
        <GameCanvas />
      </main>
    </div>
  );
};

export default Index;
