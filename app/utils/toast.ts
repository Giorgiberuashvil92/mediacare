import Toast from 'react-native-toast-message';

export const showToast = {
  success: (message: string, title?: string) => {
    Toast.show({
      type: 'success',
      text1: title || 'წარმატება',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  error: (message: string, title?: string) => {
    Toast.show({
      type: 'error',
      text1: title || 'შეცდომა',
      text2: message,
      position: 'top',
      visibilityTime: 4000,
    });
  },

  info: (message: string, title?: string) => {
    Toast.show({
      type: 'info',
      text1: title || 'ინფორმაცია',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  warning: (message: string, title?: string) => {
    Toast.show({
      type: 'info', // react-native-toast-message doesn't have warning type
      text1: title || 'გაფრთხილება',
      text2: message,
      position: 'top',
      visibilityTime: 3500,
    });
  },

  // Auth specific toasts
  auth: {
    loginSuccess: (userName: string) => {
      showToast.success(`გამარჯობა, ${userName}!`, 'წარმატებით შეხვედით');
    },
    
    loginError: (error: string) => {
      let message = 'შეცდომა შესვლისას';
      
      if (error.includes('Invalid credentials')) {
        message = 'არასწორი ელ-ფოსტა ან პაროლი';
      } else if (error.includes('User not found')) {
        message = 'მომხმარებელი არ მოიძებნა';
      } else if (error.includes('Invalid email')) {
        message = 'არასწორი ელ-ფოსტის ფორმატი';
      }
      
      showToast.error(message, 'შესვლის შეცდომა');
    },
    
    registerSuccess: (userName: string) => {
      showToast.success(`კეთილი იყოს თქვენი მობრძანება, ${userName}!`, 'რეგისტრაცია წარმატებული');
    },
    
    registerError: (error: string) => {
      let message = 'შეცდომა რეგისტრაციისას';
      
      // Convert error to lowercase for case-insensitive matching
      const errorLower = error.toLowerCase();
      
      // Check for errors in priority order: phone > idNumber > email
      // Note: Errors now include role (Doctor/Patient) in the message
      if (errorLower.includes('phone number') && errorLower.includes('already exists')) {
        if (errorLower.includes('doctor')) {
          message = 'ამ ტელეფონის ნომრით უკვე არსებობს ექიმის ანგარიში';
        } else if (errorLower.includes('patient')) {
          message = 'ამ ტელეფონის ნომრით უკვე არსებობს პაციენტის ანგარიში';
        } else {
          message = 'ამ ტელეფონის ნომრით უკვე არსებობს ანგარიში';
        }
      } else if (
        errorLower.includes('personal id number') &&
        errorLower.includes('already exists')
      ) {
        if (errorLower.includes('doctor')) {
          message = 'ამ პირადი ნომრით უკვე არსებობს ექიმის ანგარიში';
        } else if (errorLower.includes('patient')) {
          message = 'ამ პირადი ნომრით უკვე არსებობს პაციენტის ანგარიში';
        } else {
          message = 'ამ პირადი ნომრით უკვე არსებობს ანგარიში';
        }
      } else if (errorLower.includes('email') && errorLower.includes('already exists')) {
        if (errorLower.includes('doctor')) {
          message = 'ამ ელ-ფოსტით უკვე არსებობს ექიმის ანგარიში';
        } else if (errorLower.includes('patient')) {
          message = 'ამ ელ-ფოსტით უკვე არსებობს პაციენტის ანგარიში';
        } else {
          message = 'ამ ელ-ფოსტით უკვე არსებობს ანგარიში';
        }
      } else if (errorLower.includes('already exists')) {
        // Fallback for other "already exists" errors
        message = 'ეს მონაცემები უკვე გამოყენებულია';
      } else if (errorLower.includes('invalid email')) {
        message = 'არასწორი ელ-ფოსტის ფორმატი';
      } else if (errorLower.includes('password')) {
        message = 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო';
      } else if (errorLower.includes('phone number is required')) {
        message = 'ტელეფონის ნომერი აუცილებელია';
      }
      
      showToast.error(message, 'რეგისტრაციის შეცდომა');
    },
    
    logoutSuccess: () => {
      showToast.info('წარმატებით გამოხვედით', 'გასვლა');
    },
    
    logoutError: () => {
      showToast.error('შეცდომა გასვლისას', 'გასვლის შეცდომა');
    }
  },

  // API specific toasts
  api: {
    networkError: () => {
      showToast.error('ინტერნეტ კავშირი არ არის', 'ქსელის შეცდომა');
    },
    
    serverError: () => {
      showToast.error('სერვერის შეცდომა', 'სერვერის პრობლემა');
    },
    
    timeout: () => {
      showToast.error('მოთხოვნის დრო ამოიწურა', 'დროის შეცდომა');
    }
  }
};
