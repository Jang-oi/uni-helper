import { Loader2 } from 'lucide-react';

const LoadingComponent = () => {
  return (
    <div className="relative p-4  h-64">
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-opacity-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="rounded-full animate-spin h-12 w-12" />
        </div>
      </div>
    </div>
  );
};

export default LoadingComponent;
