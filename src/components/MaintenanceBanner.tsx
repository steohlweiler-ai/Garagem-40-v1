
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface MaintenanceBannerProps {
    message?: string;
    onRetry?: () => void;
}

export const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({
    message = "Sistema temporariamente indisponível — estamos investigando",
    onRetry
}) => {
    return (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r-md shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="ml-3 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-amber-700 font-medium">
                        {message}
                    </p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-2 sm:mt-0 sm:ml-4 flex items-center text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Tentar novamente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
