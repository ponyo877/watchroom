package middleware

import (
	"crypto/subtle"
	"net/http"
)

type BasicAuthConfig struct {
	Username string
	Password string
	Realm    string
}

func BasicAuth(config BasicAuthConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			username, password, ok := r.BasicAuth()

			if !ok {
				unauthorized(w, config.Realm)
				return
			}

			usernameMatch := subtle.ConstantTimeCompare([]byte(username), []byte(config.Username)) == 1
			passwordMatch := subtle.ConstantTimeCompare([]byte(password), []byte(config.Password)) == 1

			if !usernameMatch || !passwordMatch {
				unauthorized(w, config.Realm)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func unauthorized(w http.ResponseWriter, realm string) {
	if realm == "" {
		realm = "Restricted"
	}
	w.Header().Set("WWW-Authenticate", `Basic realm="`+realm+`"`)
	w.WriteHeader(http.StatusUnauthorized)
	w.Write([]byte("Unauthorized"))
}
