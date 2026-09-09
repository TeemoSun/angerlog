package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	v1 "angerlog/internal/api/v1"
	"angerlog/internal/config"
	"angerlog/internal/database"
	"angerlog/internal/repository"
	"angerlog/internal/security"
	"angerlog/internal/service"
)

func runHealthcheckProbe() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	client := &http.Client{
		Timeout: 3 * time.Second,
	}

	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%s/health", port))
	if err != nil {
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		os.Exit(1)
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil || body.Status != "ok" {
		os.Exit(1)
	}

	os.Exit(0)
}

func main() {
	healthcheckFlag := flag.Bool("healthcheck", false, "run healthcheck probe and exit")
	flag.Parse()

	if *healthcheckFlag {
		runHealthcheckProbe()
		return
	}

	log.Println("[INFO] Starting angerlog backend (Go 1.23)...")

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("[FATAL] Failed to load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	log.Println("[INFO] Connecting to database...")
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[FATAL] Database connection failed: %v", err)
	}
	defer pool.Close()

	log.Println("[INFO] Running database migrations...")
	if err := database.Migrate(ctx, pool); err != nil {
		log.Fatalf("[FATAL] Database migration failed: %v", err)
	}

	log.Println("[INFO] Upserting default user...")
	if err := database.UpsertDefaultUser(ctx, pool, cfg.Username, cfg.Password, cfg.UserTimezone); err != nil {
		log.Fatalf("[FATAL] Failed to upsert default user: %v", err)
	}

	// Initialize repositories, services, and server
	authRepo := repository.NewAuthRepository(pool)
	logRepo := repository.NewLogRepository(pool)
	statsRepo := repository.NewStatsRepository(pool)

	authService := service.NewAuthService(authRepo, cfg)
	logService := service.NewLogService(logRepo)
	statsService := service.NewStatsService(statsRepo)

	limiter := security.NewLoginRateLimiter(cfg.RateLimitLimit, cfg.RateLimitWindowSeconds)

	server := v1.NewServer(pool, cfg, authService, logService, statsService, limiter)
	handler := server.SetupRouter()

	addr := fmt.Sprintf("0.0.0.0:%s", cfg.Port)
	httpServer := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown channel
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[INFO] Server listening on %s", addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] ListenAndServe failed: %v", err)
		}
	}()

	<-stopChan
	log.Println("[INFO] Shutting down server gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("[ERROR] HTTP server shutdown error: %v", err)
	}

	log.Println("[INFO] Server stopped")
}

