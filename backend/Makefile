CD=cd
NPM=npm install
MODULES_DIR=node_modules
DEPS=journey optimist mongodb sesh eyes schemajs nodemailer step send winston winston-mongodb
EXISTING=$(subst $(MODULES_DIR)/,, $(wildcard $(MODULES_DIR)/*))
MISSING=$(filter-out $(EXISTING), $(DEPS))

all:
	@echo ""
	@echo "BioASQ Annotation Tool"
	@echo ""
	@echo "available targets:"
	@echo "  libs -- locally installs node dependencies via npm"

libs:
ifneq ($(MISSING),)
	$(NPM) $(MISSING)
endif
