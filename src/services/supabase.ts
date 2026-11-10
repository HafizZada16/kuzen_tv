import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjkofcbfthrluiqkryed.supabase.co';
const supabaseAnonKey = 'sb_publishable_vRqZpErLBpI9V8YXzKxshA_CihnLSTp';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

