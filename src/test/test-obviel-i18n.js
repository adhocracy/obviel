/*global module:false obviel:false test:false ok:false same:false $:false
  equal:false raises:false asyncTest:false start:false deepEqual: false
  stop:false strictEqual:false */

module("i18n", {
    setup: function() {
        
    },
    teardown: function() {
        obviel.i18n.clear_translations();
        obviel.i18n.clear_locale();
    }
});

var i18n = obviel.i18n;

var setup_translations = function() {
    var en_US = i18n.empty_translation_source();
    var fr_FR = i18n.translation_source({'Hello world!':
                                         'Bonjour monde!'});
    var nl_NL = i18n.translation_source({'Hello world!':
                                         'Hallo wereld!'});
    i18n.register_translation('en_US', en_US, 'i18ntest');
    i18n.register_translation('fr_FR', fr_FR, 'i18ntest');
    i18n.register_translation('nl_NL', nl_NL, 'i18ntest');
};

var setup_translations_default_domain = function() {
    var en_US = i18n.empty_translation_source();
    var fr_FR = i18n.translation_source({'Hello world!':
                                         'Bonjour monde!'});
    var nl_NL = i18n.translation_source({'Hello world!':
                                         'Hallo wereld!'});
    i18n.register_translation('en_US', en_US);
    i18n.register_translation('fr_FR', fr_FR);
    i18n.register_translation('nl_NL', nl_NL);
};

var setup_translations_multi_domains = function() {
    var en_US = i18n.empty_translation_source();
    var fr_FR = i18n.translation_source({'Hello world!':
                                         'Bonjour monde!'});
    var nl_NL = i18n.translation_source({'Hello world!':
                                         'Hallo wereld!'});
    i18n.register_translation('en_US', en_US, 'i18ntest');
    i18n.register_translation('fr_FR', fr_FR, 'i18ntest');
    i18n.register_translation('nl_NL', nl_NL, 'i18ntest');

    // now register second domain called 'other'
    en_US = i18n.empty_translation_source();
    fr_FR = i18n.translation_source({'Bye world!':
                                     'Au revoir monde!'});
    nl_NL = i18n.translation_source({'Bye world!':
                                     'Tot ziens wereld!'});
    i18n.register_translation('en_US', en_US, 'other');
    i18n.register_translation('fr_FR', fr_FR, 'other');
    i18n.register_translation('nl_NL', nl_NL, 'other');
};

test('no locale set', function() {
    setup_translations();

    var _ = i18n.domain('i18ntest');
    
    equal(_('Hello world!'), 'Hello world!');
});

test('non-translating en_US locale', function() {
    setup_translations();

    i18n.set_locale('en_US');

    var _ = i18n.domain('i18ntest');
    
    equal(_('Hello world!'), 'Hello world!');
});

test('fr_FR locale', function() {
    setup_translations();

    i18n.set_locale('fr_FR');

    var _ = i18n.domain('i18ntest');
    
    equal(_('Hello world!'), 'Bonjour monde!');
});

test('switch locale from not set to fr_FR', function() {
    setup_translations();
    
    var _ = i18n.domain('i18ntest');

    equal(_('Hello world!'), 'Hello world!');

    i18n.set_locale('fr_FR');
    
    equal(_('Hello world!'), 'Bonjour monde!');
});

test('switch locale from fr_FR to not set', function() {
    setup_translations();
    
    i18n.set_locale('fr_FR');
    
    var _ = i18n.domain('i18ntest');

    equal(_('Hello world!'), 'Bonjour monde!');

    i18n.clear_locale();
    
    equal(_('Hello world!'), 'Hello world!');
});

test('switch locale from non-translating en_US to translating fr_FR', function() {
    setup_translations();

    i18n.set_locale('en_US');

    var _ = i18n.domain('i18ntest');
    
    equal(_('Hello world!'), 'Hello world!');

    i18n.set_locale('fr_FR');
    
    equal(_('Hello world!'), 'Bonjour monde!');
});


test('switch locale from translating fr_FR to non-translating en_EN', function() {
    setup_translations();

    i18n.set_locale('fr_FR');

    var _ = i18n.domain('i18ntest');

    equal(_('Hello world!'), 'Bonjour monde!');

    i18n.set_locale('en_US');
    
    equal(_('Hello world!'), 'Hello world!');
});

test('switch locale from translating fr_FR to translating nl_NL', function() {
    setup_translations();

    i18n.set_locale('fr_FR');

    var _ = i18n.domain('i18ntest');

    equal(_('Hello world!'), 'Bonjour monde!');

    i18n.set_locale('nl_NL');
    
    equal(_('Hello world!'), 'Hallo wereld!');
});

test('switch domain, non-translating en_US locale', function() {
    setup_translations_multi_domains();

    i18n.set_locale('en_US');
    
    var _ = i18n.domain('i18ntest');
    
    equal(_('Hello world!'), 'Hello world!');

    equal(_('Bye world!'), 'Bye world!');

    var _ = i18n.domain('other');
    
    equal(_('Hello world!'), 'Hello world!');

    equal(_('Bye world!'), 'Bye world!');
});

test('switch domain, translating fr_Fr locale', function() {
    setup_translations_multi_domains();

    i18n.set_locale('fr_FR');

    var _ = i18n.domain('i18ntest');
    
    equal(_('Hello world!'), 'Bonjour monde!');

    equal(_('Bye world!'), 'Bye world!');

    var _ = i18n.domain('other');
    
    equal(_('Hello world!'), 'Hello world!');

    equal(_('Bye world!'), 'Au revoir monde!');
});

test("default domain", function() {
    setup_translations_default_domain();

    i18n.set_locale('fr_FR');

    var _ = i18n.domain('default');
    
    equal(_("Hello world!"), 'Bonjour monde!');
});

test("default domain no parameters", function() {
    setup_translations_default_domain();

    i18n.set_locale('fr_FR');

    var _ = i18n.domain();
    
    equal(_("Hello world!"), 'Bonjour monde!');
});

test('get_locale without locale set', function() {
    equal(i18n.get_locale(), null);
});

test('get_locale with locale set', function() {
    setup_translations_multi_domains();

    i18n.set_locale('fr_FR', 'i18ntest');

    equal(i18n.get_locale(), 'fr_FR');
});

test('get_locale after locale change', function() {
    setup_translations_multi_domains();

    i18n.set_locale('fr_FR');
    i18n.set_locale('nl_NL');
    
    equal(i18n.get_locale(), 'nl_NL');
});

test('use unknown locale', function() {
    setup_translations();

    raises(function() {
        i18n.set_locale('unknown');
    }, i18n.I18nError);
});


// XXX test for unknown domain in set_template_domain
// XXX test for unknown domain make_underscore

// XXX test for prepare

// XXX test for template domain in templating engine

// XXX what if current_gt isn't around yet? we do want to be able to prepare the domain