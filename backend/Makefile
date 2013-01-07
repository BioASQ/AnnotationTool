CD=cd
NPM=npm install
LIB=.
MODULES_DIR=node_modules
DEPS=journey optimist mongodb sesh response eyes schemajs nodemailer step
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
	$(CD) $(LIB) && $(NPM) $(MISSING)
endif
