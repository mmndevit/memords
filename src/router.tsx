import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { Layout } from './components/Layout'
import { VocabularyPage } from './routes/VocabularyPage'
import { PracticePage } from './routes/PracticePage'

const rootRoute = createRootRoute({ component: Layout })

const vocabularyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: VocabularyPage,
})

const practiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/practice',
  component: PracticePage,
})

const routeTree = rootRoute.addChildren([vocabularyRoute, practiceRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
