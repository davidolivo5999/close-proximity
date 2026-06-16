import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 60000, // data is fresh for 60s — prevents duplicate fetches on remount/tab switch
		},
	},
});