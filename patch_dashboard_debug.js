import fs from 'fs';
import path from 'path';

// Patching Dashboard.tsx to add console logs
const dashboardPath = path.resolve('/home/ohlweiler/Documentos/Nenê/garagem40/Garagem-40-v1/src/pages/Dashboard.tsx');
let content = fs.readFileSync(dashboardPath, 'utf8');

content = content.replace(
    /const queryFilters = useMemo\(\(\) => \{/g,
    `console.log('[DASHBOARD DEBUG] Rendering Dashboard. currentUser:', currentUser);
    const queryFilters = useMemo(() => {`
);

content = content.replace(
    /return \{[\s\S]*?excludeStatuses,[\s\S]*?statuses: filterStatuses,[\s\S]*?limit: 100,[\s\S]*?offset: 0,[\s\S]*?organizationId: currentUser\?\.organization_id[\s\S]*?\};/g,
    `const filters = {
            excludeStatuses,
            statuses: filterStatuses,
            limit: 100,
            offset: 0,
            organizationId: currentUser?.organization_id
        };
        console.log('[DASHBOARD DEBUG] queryFilters memo recalculated:', filters);
        return filters;`
);

content = content.replace(
    /const \{[\s\S]*?data: queryResult,[\s\S]*?isLoading,[\s\S]*?isFetching: isLoadingMore,[\s\S]*?error: queryError,[\s\S]*?refetch[\s\S]*?\} = useServicesQuery\(queryFilters\);/g,
    `const {
        data: queryResult,
        isLoading,
        isFetching: isLoadingMore,
        error: queryError,
        refetch
    } = useServicesQuery(queryFilters);
    console.log('[DASHBOARD DEBUG] useServicesQuery result:', { queryResult, isLoading, isLoadingMore, queryError, isQueryEnabled: !!queryFilters.organizationId });`
);

fs.writeFileSync(dashboardPath, content);
console.log('Dashboard patched.');
