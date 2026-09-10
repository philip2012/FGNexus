import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import PropertyBrowserView from '@/views/PropertyBrowserView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/properties',
      name: 'properties',
      component: PropertyBrowserView,
    },
  ],
})

export default router
