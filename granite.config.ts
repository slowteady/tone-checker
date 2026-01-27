import { appsInToss } from '@apps-in-toss/framework/plugins';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  scheme: 'intoss',
  appName: 'tone-checker',
  plugins: [
    appsInToss({
      brand: {
        displayName: '이 말투 어때', // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
        primaryColor: '#5A5AFF', // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
        icon: 'https://static.toss.im/appsintoss/17559/e9702e48-2cfa-4d46-84cc-94e0ed553ba2.png', // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
      },
      permissions: [
        {
          name: 'clipboard',
          access: 'read',
        },
      ],
    }),
  ],
});
