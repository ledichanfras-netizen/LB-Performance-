# Navigation starts at the top

Screen changes reset page scroll in a layout effect for every viewport. The previous implementation only called window.scrollTo above 768px, leaving mobile scroll intact and overlooking independently scrolling content containers.

The reset covers the document, body, main content and its ancestor containers. It does not traverse descendants or reset sidebar, bottom-navigation, chart or dialog scroll areas. Changes to the active tab, dashboard subsection or selected athlete trigger the reset; ordinary data updates do not. Navigation click capture also resets the active screen when the same icon is tapped again.

Validation used the actual production app build with synthetic accounts and intercepted local API responses at 390×844, 768×1024 and 1280×900. Both athlete and coach navigation passed, including the decision matrix, dashboard subsections and repeated taps on the current icon. TypeScript checks and the production build passed. No real account or database data was modified for the tests.
