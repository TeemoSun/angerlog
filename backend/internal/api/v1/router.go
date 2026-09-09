package v1

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"angerlog/internal/config"
	"angerlog/internal/models"
	"angerlog/internal/security"
	"angerlog/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	pool        *pgxpool.Pool
	cfg         *config.Config
	authService *service.AuthService
	logService  *service.LogService
	statsService *service.StatsService
	limiter     *security.LoginRateLimiter
	mw          *MiddlewareManager
	authH       *AuthHandler
	logH        *LogHandler
	statsH      *StatsHandler
}

func NewServer(
	pool *pgxpool.Pool,
	cfg *config.Config,
	authService *service.AuthService,
	logService *service.LogService,
	statsService *service.StatsService,
	limiter *security.LoginRateLimiter,
) *Server {
	mw := NewMiddlewareManager(authService, cfg)
	authH := NewAuthHandler(authService, limiter, cfg)
	logH := NewLogHandler(logService)
	statsH := NewStatsHandler(statsService)

	return &Server{
		pool:         pool,
		cfg:          cfg,
		authService:  authService,
		logService:   logService,
		statsService: statsService,
		limiter:      limiter,
		mw:           mw,
		authH:        authH,
		logH:         logH,
		statsH:       statsH,
	}
}

func (s *Server) Health(w http.ResponseWriter, r *http.Request) {
	if err := s.pool.Ping(r.Context()); err != nil {
		models.WriteError(w, models.ErrInternal)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *Server) SetupRouter() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					models.WriteError(w, models.ErrInternal)
				}
			}()
			next.ServeHTTP(w, r)
		})
	})

	corsOpts := cors.Options{
		AllowedOrigins:   s.cfg.CORSOriginsList,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	}
	r.Use(cors.Handler(corsOpts))

	// Health check probe
	r.Get("/health", s.Health)

	// API v1
	r.Route("/api/v1", func(r chi.Router) {
		// Auth routes
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", s.authH.Login)
			r.Post("/refresh", s.authH.Refresh)
			r.Post("/logout", s.authH.Logout)

			// Protected auth routes (RequireAuth)
			r.Group(func(r chi.Router) {
				r.Use(s.mw.RequireAuth)
				r.Get("/me", s.authH.GetMe)

				// Protected with CSRF (RequireAuth + RequireCSRF)
				r.Group(func(r chi.Router) {
					r.Use(s.mw.RequireCSRF)
					r.Put("/bottle-style", s.authH.UpdateBottleStyle)
					r.Patch("/bottle-style", s.authH.UpdateBottleStyle)
				})
			})
		})

		// Logs routes
		r.Route("/logs", func(r chi.Router) {
			r.Use(s.mw.RequireAuth)
			r.Get("/", s.logH.ListLogs)
			r.Get("/{id}", s.logH.GetLog)

			// Write routes require CSRF
			r.Group(func(r chi.Router) {
				r.Use(s.mw.RequireCSRF)
				r.Post("/", s.logH.CreateLog)
				r.Put("/{id}", s.logH.UpdateLog)
				r.Delete("/{id}", s.logH.DeleteLog)
			})
		})

		// Stats routes
		r.Route("/stats", func(r chi.Router) {
			r.Use(s.mw.RequireAuth)
			r.Get("/summary", s.statsH.GetSummary)
			r.Get("/trend", s.statsH.GetTrend)
			r.Get("/heatmap", s.statsH.GetHeatmap)
		})

		// 404 for unknown api routes
		r.NotFound(func(w http.ResponseWriter, r *http.Request) {
			models.WriteError(w, models.ErrNotFound)
		})
	})

	// Mount SPA static files if directory exists
	if s.cfg.FrontendDist != "" {
		if stat, err := os.Stat(s.cfg.FrontendDist); err == nil && stat.IsDir() {
			s.mountSPA(r, s.cfg.FrontendDist)
		}
	}

	return r
}

func (s *Server) mountSPA(r *chi.Mux, distDir string) {
	fs := http.FileServer(http.Dir(distDir))

	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		path := req.URL.Path

		// Never serve SPA index for /api or /health
		if strings.HasPrefix(path, "/api") || path == "/health" {
			models.WriteError(w, models.ErrNotFound)
			return
		}

		filePath := filepath.Join(distDir, filepath.Clean(path))
		if stat, err := os.Stat(filePath); err == nil && !stat.IsDir() {
			fs.ServeHTTP(w, req)
			return
		}

		// Fallback to index.html for SPA client-side routing
		indexPath := filepath.Join(distDir, "index.html")
		http.ServeFile(w, req, indexPath)
	})
}
