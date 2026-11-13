/** Server uchun demo javoblar: umumiy dvigatel (shared/demo.js) + server kutubxonasi. */
import { demoReply as sharedDemoReply } from '../../shared/demo.js';
import { library } from './library.js';

export const demoReply = (message) => sharedDemoReply(message, library);
