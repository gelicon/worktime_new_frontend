import requestToAPI from './Request'

// ключ для хранения предпочтений пользователя содержит имя пользователя
const buildKey =  (key)=>(requestToAPI.user?requestToAPI.user.login:"everybody")+"."+key;
const storage = sessionStorage;

export const savePreference = (key,value)=>{
    if(value) {
        storage.setItem(buildKey(key),JSON.stringify(value));
    } else {
        storage.removeItem(buildKey(key));    
    }
}

export const loadPreference = (key)=>{
    const value = storage.getItem(buildKey(key));
    if(value) return JSON.parse(value);
}

export const enumPreferences = (f)=>{
    const prefix = buildKey("");
    Object.keys(storage)
        .filter(k=>k.startsWith(prefix))
        .forEach(key=>f(key.slice(prefix.length)));
}

export const dropPreference = (key)=>{
    if(Array.isArray(key)) {
        key.forEach(k=>{
            storage.removeItem(buildKey(k));    
        })
    } else {
        storage.removeItem(buildKey(key));    
    }
}

export const dropAllPreferenceForUser = (userLogin)=>{
    Object.keys(storage)
        .filter(k=>k.startsWith(userLogin+"."))
        .forEach(k=>storage.removeItem(k));    
}

