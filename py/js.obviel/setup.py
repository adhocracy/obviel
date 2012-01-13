from setuptools import setup, find_packages
import os

version = '0.12'

def read(*rnames):
    return open(os.path.join(os.path.dirname(__file__), *rnames)).read()

long_description = (
    read('README.txt')
    + '\n' +
    read('CHANGES.txt'))

setup(
    name='js.obviel',
    version=version,
    description="Fanstatic packaging of Obviel",
    long_description=long_description,
    classifiers=[],
    keywords='',
    author='Fanstatic Developers',
    author_email='fanstatic@googlegroups.com',
    license='BSD',
    packages=find_packages(),
    namespace_packages=['js'],
#    include_package_data=True,
    package_data={
        'js.obviel': ['resources'],
        '': ['*.js'],
        'js.obviel': ['resources/*.js'],
        },
    zip_safe=False,
    install_requires=[
        'fanstatic',
        'setuptools',
        'js.jquery >= 1.6',
        'js.jquery_datalink >= 1.0.0-1',
        'js.jquery_datatables >= 1.8.2',
        'js.jquery_jgrowl',
        'js.jqueryui',
        'js.jsgettext',
        'js.json2',
        'js.json_template',
        ],
    entry_points={
        'fanstatic.libraries': [
            'obviel = js.obviel:library',
            ],
        },
    )
