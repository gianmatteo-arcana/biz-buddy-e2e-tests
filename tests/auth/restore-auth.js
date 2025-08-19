const fs = require('fs');

// The auth state we saved earlier
const authState = {
  "cookies": [
    {
      "name": "OTZ",
      "value": "8202226_84_88_104280_84_446940",
      "domain": "accounts.google.com",
      "path": "/",
      "expires": 1757029569,
      "httpOnly": false,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "NID",
      "value": "525=hQJKY8uXHYErbi-OdMfIga5aZAebOJtL-LNbnaG60LS7LpTXNtZAV-zH-T-CgNFjL5E-U_H44qeaZU9ygC2fKxPJVjUcCl4ihsDY5qdgsSwhYM96cO0IaZCiGdx4j_YmIi_jqijZf0ixSu_J8ohqMEXjl-TE4oq-fmXoVqCUcdE4SJBFdh_Ofh2to9r3TgyjCqvfNwTD1mOGYEdWv0_QnikLMNC3Rq1kAcLBNhziifV-GN6Es2ip9VStyOLoLbLi9_m1-1Qitt0NcAHstkLm4E8piwA3Wh08LRFJ0fzefSSX1d2YsQphBB7m2XUzGilXa2VQK7yLTQTagQ5KYPrNnypXaak_evwWED8-ByF62kxERsagQ3wZRp4aYoUTuyWmet7Sd74Vlp4hpmasn7IjA_dNS88ZxYDDdbUZGPFjiT-W7RwRcJDpT2ROyUhH5QRchCbs61d4Q2nC8JE7XLGsUEEoK9u2VobmJYXwifD-75MGoctkEWeAnE7EkVTAfpkGCzxLQvL5CGnL6OmSP93J4Gt1mcxnMbFmKfTQyotQlh0QL3FfLPAjD1UjaPRPgf81xAScb2TfNSjrPD_ilHoUe-E9Auerolp8tXu8nYoIuTzLMgHG2xg-ipLnEs38ZC64",
      "domain": ".google.com",
      "path": "/",
      "expires": 1770247465.169868,
      "httpOnly": true,
      "secure": true,
      "sameSite": "None"
    },
    {
      "name": "SID",
      "value": "g.a000zwh4UXxhvH4dQkWK2Kuxo4p6aiK4V02Y2CeUmUU7_vpPVte3ATtKDXlc-bQNVFrYIkEI3wACgYKAdESARESFQHGX2MiUAZcUGeXwR5mwmHhryTNuRoVAUF8yKr3XHY5QnbE-lBc77gTBjJZ0076",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.170122,
      "httpOnly": false,
      "secure": false,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-1PSID",
      "value": "g.a000zwh4UXxhvH4dQkWK2Kuxo4p6aiK4V02Y2CeUmUU7_vpPVte3z_5FKFdY1WkrGupfWx15aQACgYKAV8SARESFQHGX2MiyQNlKXcXR3QG7acrReld9RoVAUF8yKqlXCyuRcKX3H0CNsD-lgag0076",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.170238,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-3PSID",
      "value": "g.a000zwh4UXxhvH4dQkWK2Kuxo4p6aiK4V02Y2CeUmUU7_vpPVte3fE_MTqqZx7V_QxD94TOgUQACgYKAUISARESFQHGX2MirPYDbarwEGbR2BS9N1fQ9RoVAUF8yKr0VL9AqPNwvMKUC9e9yw-20076",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.170382,
      "httpOnly": true,
      "secure": true,
      "sameSite": "None"
    },
    {
      "name": "HSID",
      "value": "A_r-5xFr6ap-vqrRz",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.170703,
      "httpOnly": true,
      "secure": false,
      "sameSite": "Lax"
    },
    {
      "name": "SSID",
      "value": "AOC77Emiyn_cpYZme",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.170838,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "APISID",
      "value": "SRA0T0THl5jh-RR2/Aopr_ZXuSvVq-d9Kf",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.170992,
      "httpOnly": false,
      "secure": false,
      "sameSite": "Lax"
    },
    {
      "name": "SAPISID",
      "value": "uLjCXXceEdWZxU68/AS3-YwxuofrPzf3Cs",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.171068,
      "httpOnly": false,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-1PAPISID",
      "value": "uLjCXXceEdWZxU68/AS3-YwxuofrPzf3Cs",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.17112,
      "httpOnly": false,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-3PAPISID",
      "value": "uLjCXXceEdWZxU68/AS3-YwxuofrPzf3Cs",
      "domain": ".google.com",
      "path": "/",
      "expires": 1788996276.171177,
      "httpOnly": false,
      "secure": true,
      "sameSite": "None"
    },
    {
      "name": "__Host-GAPS",
      "value": "1:AqP5fxl-5fQ0fNPLP0VJoMNj09vzl-Rwj9hNBftMOPQt9wZ09ybm2i5AUeRJBjCSUNvN7atcJ7y08G9Um9d_imIf_Ng6vA:ffzcTMQhXO13KCM-",
      "domain": "accounts.google.com",
      "path": "/",
      "expires": 1788996276.171288,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "LSID",
      "value": "s.youtube:g.a000zwh4UXCP0-U4-esOLd-0CoUsOHeNtKvCwxmn-EMBDZNfXXmUKxvYwWCknPW-JQaCKqM8GQACgYKATwSARESFQHGX2MihV9YviGGS0MuLI038FpsWBoVAUF8yKr5E4WRzRAFMP95O86OnFFh0076",
      "domain": "accounts.google.com",
      "path": "/",
      "expires": 1788996276.266625,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Host-1PLSID",
      "value": "s.youtube:g.a000zwh4UXCP0-U4-esOLd-0CoUsOHeNtKvCwxmn-EMBDZNfXXmUQWtasUpQuc5K7UW8r7sTCQACgYKAdESARESFQHGX2MiZyKTUuzkxMvLf2Ru0SG77BoVAUF8yKo0wduaziV5PsHTU5hRGfXF0076",
      "domain": "accounts.google.com",
      "path": "/",
      "expires": 1788996276.266698,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Host-3PLSID",
      "value": "s.youtube:g.a000zwh4UXCP0-U4-esOLd-0CoUsOHeNtKvCwxmn-EMBDZNfXXmUQWtasUpQuc5K7UW8r7sTCQACgYKARISARESFQHGX2MiKC_e8bhbeyZRslI2NmsHGBoVAUF8yKqm64BM2DZTJD9LMec1gZs50076",
      "domain": "accounts.google.com",
      "path": "/",
      "expires": 1788996276.266737,
      "httpOnly": true,
      "secure": true,
      "sameSite": "None"
    },
    {
      "name": "ACCOUNT_CHOOSER",
      "value": "AFx_qI7x5gzfJU2yqz8gYCyjnmyAMidG-LNUrnWtwOpxLcf9KqM68iEBb9vkE_iTkB2WqTkjLicOE8YbEBw2Nit_zKKthecKxiQ-Luy3-hbEY-lIZk2B4sLyjZlTwc5cepDfD79Y8mvIo57R0e2F-K9jQtJVDd8KqHAJ9OVfTqdnSu25tc7IN3U",
      "domain": "accounts.google.com",
      "path": "/",
      "expires": 1788996276.266767,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-1PSIDTS",
      "value": "sidts-CjUB5H03P1d9i08nBhPGiaKnkEE0ZGTSypx0hB6oM3_MTgA_FSS1q5SGu4uMc3LzNI5CwGB7whAA",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1785972276.405045,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-3PSIDTS",
      "value": "sidts-CjUB5H03P1d9i08nBhPGiaKnkEE0ZGTSypx0hB6oM3_MTgA_FSS1q5SGu4uMc3LzNI5CwGB7whAA",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1785972276.405208,
      "httpOnly": true,
      "secure": true,
      "sameSite": "None"
    },
    {
      "name": "HSID",
      "value": "AIwxm9vAFbFC3gFC9",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.40549,
      "httpOnly": true,
      "secure": false,
      "sameSite": "Lax"
    },
    {
      "name": "SSID",
      "value": "AvlIcffYBgkJyS4WY",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.405643,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "APISID",
      "value": "SRA0T0THl5jh-RR2/Aopr_ZXuSvVq-d9Kf",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.405737,
      "httpOnly": false,
      "secure": false,
      "sameSite": "Lax"
    },
    {
      "name": "SAPISID",
      "value": "uLjCXXceEdWZxU68/AS3-YwxuofrPzf3Cs",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.405805,
      "httpOnly": false,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-1PAPISID",
      "value": "uLjCXXceEdWZxU68/AS3-YwxuofrPzf3Cs",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.405865,
      "httpOnly": false,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-3PAPISID",
      "value": "uLjCXXceEdWZxU68/AS3-YwxuofrPzf3Cs",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.40592,
      "httpOnly": false,
      "secure": true,
      "sameSite": "None"
    },
    {
      "name": "SID",
      "value": "g.a000zwh4UXxhvH4dQkWK2Kuxo4p6aiK4V02Y2CeUmUU7_vpPVte3ATtKDXlc-bQNVFrYIkEI3wACgYKAdESARESFQHGX2MiUAZcUGeXwR5mwmHhryTNuRoVAUF8yKr3XHY5QnbE-lBc77gTBjJZ0076",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.40598,
      "httpOnly": false,
      "secure": false,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-1PSID",
      "value": "g.a000zwh4UXxhvH4dQkWK2Kuxo4p6aiK4V02Y2CeUmUU7_vpPVte3z_5FKFdY1WkrGupfWx15aQACgYKAV8SARESFQHGX2MiyQNlKXcXR3QG7acrReld9RoVAUF8yKqlXCyuRcKX3H0CNsD-lgag0076",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.406038,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-3PSID",
      "value": "g.a000zwh4UXxhvH4dQkWK2Kuxo4p6aiK4V02Y2CeUmUU7_vpPVte3fE_MTqqZx7V_QxD94TOgUQACgYKAUISARESFQHGX2MirPYDbarwEGbR2BS9N1fQ9RoVAUF8yKr0VL9AqPNwvMKUC9e9yw-20076",
      "domain": ".youtube.com",
      "path": "/",
      "expires": 1788996276.406093,
      "httpOnly": true,
      "secure": true,
      "sameSite": "None"
    },
    {
      "name": "SIDCC",
      "value": "AKEyXzVCgZOXGx7PIcmljCd2034P09LsBDZDttsOHwRh67ihsd2tdhDrzKD9ga_Bw8swtjxZ_Q",
      "domain": ".google.com",
      "path": "/",
      "expires": 1785972279.733319,
      "httpOnly": false,
      "secure": false,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-1PSIDCC",
      "value": "AKEyXzVD3ni_l2vCHFO_49OWgDFkYcEWZ27k1PfUe4W8Nry2soLXxKvbAQRmt6dScFUeo3AS",
      "domain": ".google.com",
      "path": "/",
      "expires": 1785972279.733361,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    },
    {
      "name": "__Secure-3PSIDCC",
      "value": "AKEyXzV1QImfet_v-RQkDQeKm9zA7DHfrp-4zSbjUzylUdhSOFMhSc1ozdrrV_JkcgFaJxoo",
      "domain": ".google.com",
      "path": "/",
      "expires": 1785972279.733392,
      "httpOnly": true,
      "secure": true,
      "sameSite": "None"
    }
  ],
  "origins": [
    {
      "origin": "https://c8eb2d86-d79d-470d-b29c-7a82d220346b.lovableproject.com",
      "localStorage": [
        {
          "name": "sb-raenkewzlvrdqufwxjpl-auth-token",
          "value": "{\"provider_token\":\"ya29.a0AS3H6NwZkKadP372XtMyGeR3ejSn53qFW4XAClMYK3sUlFi2eu6t_Tfl62H5aH7HjLoiZ6yVhBf82iGzNANpuPCvkpf72bmNukv-yxq4IyxroP3fJaGp221d-yhZpJQ1yZq2KPoIyu6jtSbgUcViseKDCYYDm5VXWgfAXFIkaCgYKAXESARESFQHGX2Mi096iliAz0Nmy7q2eSY6Tqw0175\",\"provider_refresh_token\":\"1//06GA3RwO9-j6DCgYIARAAGAYSNwF-L9IrgpdZKk4vRu1TJGjt3hr_O4FYV6a-n6HY1cEOTsvdwjIcFO6ONzjxghKR51c2a5NC89U\",\"access_token\":\"eyJhbGciOiJIUzI1NiIsImtpZCI6Im52ZGliRVo0YVhldkpacHIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3JhZW5rZXd6bHZyZHF1Znd4anBsLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4ZThlYTdiZC1iN2ZiLTRlNzctOGUzNC1hYTU1MWZlMjY5MzQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0NDQxMTgxLCJpYXQiOjE3NTQ0Mzc1ODEsImVtYWlsIjoiZ2lhbm1hdHRlby5hbGx5bi50ZXN0QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS0JoTGx0aWJFelZMMEpCdG02UVZncHNidnlYeUpUWlRSWHdVSnZOYWhmTXFfTDNnPXM5Ni1jIiwiZW1haWwiOiJnaWFubWF0dGVvLmFsbHluLnRlc3RAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkdpYW5tYXR0ZW8gQWxseW4iLCJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYW1lIjoiR2lhbm1hdHRlbyBBbGx5biIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0tCaExsdGliRXpWTDBKQnRtNlFWZ3BzYnZ5WHlKVFpUUlh3VUp2TmFoZk1xX0wzZz1zOTYtYyIsInByb3ZpZGVyX2lkIjoiMTEzOTk2NzM3NjA5NjYxNjYzNTAwIiwic3ViIjoiMTEzOTk2NzM3NjA5NjYxNjYzNTAwIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3NTQ0Mzc1ODF9XSwic2Vzc2lvbl9pZCI6ImQ5YmRiZGRlLTM2ZjUtNGFhMy04Yjc3LWJmYTQ2OWY1MTRmOSIsImlzX2Fub255bW91cyI6ZmFsc2V9.D9RnBFXss7Vo6GhtP2emIPMSg92050NAPMi34QuYrP0\",\"expires_in\":3600,\"expires_at\":1754441181,\"refresh_token\":\"ji7of3mmpk4q\",\"token_type\":\"bearer\",\"user\":{\"id\":\"8e8ea7bd-b7fb-4e77-8e34-aa551fe26934\",\"aud\":\"authenticated\",\"role\":\"authenticated\",\"email\":\"gianmatteo.allyn.test@gmail.com\",\"email_confirmed_at\":\"2025-08-05T21:53:32.589138Z\",\"phone\":\"\",\"confirmed_at\":\"2025-08-05T21:53:32.589138Z\",\"last_sign_in_at\":\"2025-08-05T23:46:21.700526Z\",\"app_metadata\":{\"provider\":\"google\",\"providers\":[\"google\"]},\"user_metadata\":{\"avatar_url\":\"https://lh3.googleusercontent.com/a/ACg8ocKBhLltibEzVL0JBtm6QVgpsbvyXyJTZTRXwUJvNahfMq_L3g=s96-c\",\"email\":\"gianmatteo.allyn.test@gmail.com\",\"email_verified\":true,\"full_name\":\"Gianmatteo Allyn\",\"iss\":\"https://accounts.google.com\",\"name\":\"Gianmatteo Allyn\",\"phone_verified\":false,\"picture\":\"https://lh3.googleusercontent.com/a/ACg8ocKBhLltibEzVL0JBtm6QVgpsbvyXyJTZTRXwUJvNahfMq_L3g=s96-c\",\"provider_id\":\"113996737609661663500\",\"sub\":\"113996737609661663500\"},\"identities\":[{\"identity_id\":\"54f7db0b-1efd-421c-8c7f-3f4edf7e1fdc\",\"id\":\"113996737609661663500\",\"user_id\":\"8e8ea7bd-b7fb-4e77-8e34-aa551fe26934\",\"identity_data\":{\"avatar_url\":\"https://lh3.googleusercontent.com/a/ACg8ocKBhLltibEzVL0JBtm6QVgpsbvyXyJTZTRXwUJvNahfMq_L3g=s96-c\",\"email\":\"gianmatteo.allyn.test@gmail.com\",\"email_verified\":true,\"full_name\":\"Gianmatteo Allyn\",\"iss\":\"https://accounts.google.com\",\"name\":\"Gianmatteo Allyn\",\"phone_verified\":false,\"picture\":\"https://lh3.googleusercontent.com/a/ACg8ocKBhLltibEzVL0JBtm6QVgpsbvyXyJTZTRXwUJvNahfMq_L3g=s96-c\",\"provider_id\":\"113996737609661663500\",\"sub\":\"113996737609661663500\"},\"provider\":\"google\",\"last_sign_in_at\":\"2025-08-05T21:53:32.576541Z\",\"created_at\":\"2025-08-05T21:53:32.576591Z\",\"updated_at\":\"2025-08-05T23:46:21.694847Z\",\"email\":\"gianmatteo.allyn.test@gmail.com\"}],\"created_at\":\"2025-08-05T21:53:32.553994Z\",\"updated_at\":\"2025-08-05T23:46:21.70399Z\",\"is_anonymous\":false}}"
        }
      ]
    }
  ]
};

// Write the auth state to file
fs.writeFileSync('.auth/user-state.json', JSON.stringify(authState, null, 2));
console.log('✅ Auth state restored successfully');
console.log(`   - ${authState.cookies.length} cookies`);
console.log(`   - ${authState.origins.length} origins with localStorage`);